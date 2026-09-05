"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { modelloPerTipo, MODELLI } from "@repo/shared/formati";

export interface EsitoModello {
  error?: string;
  success?: string;
}

/**
 * Applica il modello di un formato di locale.
 *
 * Crea le categorie mancanti e i gruppi di scelte sui piatti che già ci
 * sono. Non tocca nulla di esistente: chi ha già caricato mezzo menu non
 * deve ritrovarselo riscritto, e chi cambia idea sul formato non perde il
 * lavoro fatto.
 */
export async function applicaModello(formData: FormData): Promise<EsitoModello> {
  const { venue } = await requireRole(["owner", "manager"], "ordini");

  const tipo = String(formData.get("tipo") ?? "");
  const modello = modelloPerTipo(tipo);
  if (!modello) return { error: "Formato non riconosciuto" };

  const soloCategorie = formData.get("soloCategorie") === "on";

  const sql = db();

  /*
   * Il formato accende anche il modo di lavorare, se ne ha uno.
   *
   * Prima toccava solo le categorie del menu: una piadineria applicava il
   * proprio modello e si ritrovava comunque la sala dei tavoli, con un QR
   * per tavolo e il conto condiviso — cioè la piadina del secondo cliente
   * addebitata al primo. Il formato dice com'è fatto il menu e come si
   * consegna: sono la stessa scelta.
   *
   * Restano interruttori: chi ha quattro tavolini fuori li rimette in
   * Impostazioni. Qui si sceglie da dove parte.
   */
  const modo = modello.modo;
  await sql`
    update venues set
      venue_type = ${tipo},
      servizio_al_banco = ${modo?.alBanco ?? sql`servizio_al_banco`},
      pickup_numbering_enabled = ${modo?.numeriRitiro ?? sql`pickup_numbering_enabled`},
      -- Un numero che nessuno chiama non serve: si parte avvisando sul
      -- telefono, che è l'unico modo che non richiede di comprare niente.
      pickup_metodi = ${
        modo?.numeriRitiro
          ? sql`case when cardinality(pickup_metodi) = 0
                     then array['telefono'] else pickup_metodi end`
          : sql`pickup_metodi`
      }
    where id = ${venue.venueId}`;

  const esistenti = await sql<{ id: string; name: string }[]>`
    select id, name from menu_categories where venue_id = ${venue.venueId}`;
  const perNome = new Map(esistenti.map((c) => [c.name.toLowerCase(), c.id]));

  let categorieCreate = 0;
  for (const [i, nome] of modello.categorie.entries()) {
    if (perNome.has(nome.toLowerCase())) continue;
    const [creata] = await sql<{ id: string }[]>`
      insert into menu_categories (venue_id, name, sort_order)
      values (${venue.venueId}, ${nome},
              coalesce((select max(sort_order) + 1 from menu_categories
                         where venue_id = ${venue.venueId}), ${i}))
      returning id`;
    perNome.set(nome.toLowerCase(), creata.id);
    categorieCreate += 1;
  }

  if (soloCategorie) {
    revalidatePath("/dashboard/menu");
    return {
      success:
        categorieCreate > 0
          ? `${categorieCreate} categorie aggiunte. I piatti li carichi tu.`
          : "Le categorie c'erano già. Formato impostato.",
    };
  }

  // I gruppi si applicano ai piatti già presenti nelle categorie previste:
  // su un menu vuoto non c'è nulla a cui attaccarli, ed è normale.
  let gruppiCreati = 0;

  for (const g of modello.gruppi) {
    const idCategorie = g.categorie
      .map((n) => perNome.get(n.toLowerCase()))
      .filter((id): id is string => Boolean(id));

    if (idCategorie.length === 0) continue;

    const piatti = await sql<{ id: string }[]>`
      select id from menu_items
       where venue_id = ${venue.venueId}
         and category_id in ${sql(idCategorie)}`;

    for (const p of piatti) {
      // Un gruppo con lo stesso nome c'è già: il ristoratore l'ha
      // configurato a modo suo e non va sovrascritto.
      const [gia] = await sql<{ id: string }[]>`
        select id from menu_option_groups
         where menu_item_id = ${p.id} and lower(name) = lower(${g.nome})`;
      if (gia) continue;

      const [gruppo] = await sql<{ id: string }[]>`
        insert into menu_option_groups
          (venue_id, menu_item_id, name, kind, required, min_choices,
           max_choices, sort_order)
        values (${venue.venueId}, ${p.id}, ${g.nome}, ${g.tipo},
                ${g.obbligatorio}, ${g.obbligatorio ? 1 : 0},
                ${g.multiplo ? 10 : 1},
                coalesce((select max(sort_order) + 1 from menu_option_groups
                           where menu_item_id = ${p.id}), 0))
        returning id`;

      for (const [j, [nome, delta]] of g.opzioni.entries()) {
        await sql`
          insert into menu_options (group_id, name, price_delta_cents, sort_order)
          values (${gruppo.id}, ${nome}, ${delta}, ${j})`;
      }
      gruppiCreati += 1;
    }
  }

  revalidatePath("/dashboard/menu");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");

  const nota = modo?.alBanco
    ? " Consegna al bancone accesa: ogni cliente ha il suo conto e il suo " +
      "numero, e la pagina principale diventa il Banco."
    : "";

  if (categorieCreate === 0 && gruppiCreati === 0) {
    return {
      success:
        "Formato impostato. Non c'era nulla da aggiungere: categorie e scelte esistono già." +
        nota,
    };
  }

  return {
    success:
      `Formato impostato. ${categorieCreate} categorie aggiunte, ` +
      `${gruppiCreati} gruppi di scelte creati sui piatti esistenti. ` +
      "Prezzi e opzioni li ritocchi voce per voce." +
      nota,
  };
}

/** Elenco dei formati, per la scelta in interfaccia. */
export async function formatiDisponibili() {
  return MODELLI.map((m) => ({
    tipo: m.tipo,
    nome: m.nome,
    descrizione: m.descrizione,
    categorie: m.categorie.length,
    gruppi: m.gruppi.length,
  }));
}
