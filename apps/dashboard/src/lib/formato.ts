import "server-only";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { modelloPerTipo } from "@repo/shared/formati";
import { seminaReparti } from "@/lib/reparti-locale";
import { tMenuAdmin } from "@/i18n/menu";
import { linguaUtente } from "@/lib/lingua";

export interface EsitoModello {
  error?: string;
  success?: string;
}

/**
 * Applica il modello di un formato di locale.
 *
 * Crea le categorie mancanti e i gruppi di scelte sui piatti che già ci
 * sono, e accende il modo di lavorare che il formato porta con sé. Non tocca
 * nulla di esistente: chi ha già caricato mezzo menu non deve ritrovarselo
 * riscritto, e chi cambia idea sul formato non perde il lavoro fatto.
 *
 * Sta qui e non in una Server Action perché la usano in due: il ristoratore
 * dal proprio menu, e chi vende dal pannello di piattaforma quando prepara
 * un cliente nuovo. Scritta due volte, le due copie avrebbero smesso di fare
 * la stessa cosa al primo formato aggiunto.
 *
 * Chiama chi ha già verificato i permessi: questa funzione non li controlla.
 */
export async function applicaFormato(
  venueId: string,
  tipo: string,
  soloCategorie: boolean,
  /** Crea anche un listino di partenza, non disponibile finché non è rivisto. */
  conListino = false
): Promise<EsitoModello> {
  /* La lingua si rilegge qui invece di arrivare come parametro: i due
     chiamanti sono in due aree diverse — il menu del ristoratore e il
     pannello di piattaforma — e un parametro in più è un parametro che uno
     dei due prima o poi non passa. */
  const t = tMenuAdmin(await linguaUtente());

  const modello = modelloPerTipo(tipo);
  if (!modello) return { error: t("applica.errore.tipo") };

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
    where id = ${venueId}`;

  const esistenti = await sql<{ id: string; name: string }[]>`
    select id, name from menu_categories where venue_id = ${venueId}`;
  const perNome = new Map(esistenti.map((c) => [c.name.toLowerCase(), c.id]));

  /*
   * Le postazioni che questo formato usa entrano nell'elenco del locale.
   *
   * Sono un punto di partenza, non una gabbia: da lì il ristoratore le
   * rinomina, ne aggiunge e ne toglie, perché ogni locale è fatto a modo
   * suo. Applicare di nuovo un formato non le rinomina indietro.
   */
  await seminaReparti(
    sql,
    venueId,
    modello.categorie.map((c) => c.reparto ?? "cucina")
  );

  let categorieCreate = 0;
  for (const [i, cat] of modello.categorie.entries()) {
    if (perNome.has(cat.nome.toLowerCase())) continue;

    /*
     * La categoria nasce col suo reparto, non senza.
     *
     * Il reparto decide su quale schermo compare la comanda e chi la può
     * muovere: lasciandolo al valore di partenza, i cocktail di una
     * gintoneria finivano sullo schermo della cucina, e il barista — che ha
     * il permesso solo sul bar — non poteva toccarli. Il formato sa dove si
     * prepara ogni cosa: è l'unica occasione in cui lo sa senza chiedere.
     */
    const [creata] = await sql<{ id: string }[]>`
      insert into menu_categories (venue_id, name, sort_order, reparto)
      values (${venueId}, ${cat.nome},
              coalesce((select max(sort_order) + 1 from menu_categories
                         where venue_id = ${venueId}), ${i}),
              ${cat.reparto ?? "cucina"})
      returning id`;
    perNome.set(cat.nome.toLowerCase(), creata.id);
    categorieCreate += 1;
  }

  /*
   * Aliquota e genere sui piatti che ci finiscono dentro.
   *
   * Non si tocca quello che il ristoratore ha già messo a mano: si scrive
   * solo dove è rimasto il valore di partenza. Una carta di gin lasciata al
   * 10% è un errore fiscale che non dà nessun errore.
   */
  let ritoccati = 0;
  for (const cat of modello.categorie) {
    const id = perNome.get(cat.nome.toLowerCase());
    if (!id) continue;

    /*
     * Il reparto si scriveva solo alla creazione, e una categoria arrivata
     * prima — dall'import CSV, o battuta a mano — restava in cucina per
     * sempre: riapplicare il formato non la spostava. Come per l'aliquota,
     * si tocca solo dove è rimasto il valore di partenza: chi ha già
     * assegnato Nigiri a una postazione sua non se la ritrova cambiata.
     */
    if (cat.reparto) {
      await sql`
        update menu_categories set reparto = ${cat.reparto}
         where venue_id = ${venueId} and id = ${id} and reparto = 'cucina'`;
    }

    if (cat.iva) {
      const r = await sql`
        update menu_items set vat_rate = ${cat.iva}
         where venue_id = ${venueId} and category_id = ${id}
           and vat_rate = 10.00
        returning id`;
      ritoccati += r.length;
    }

    if (cat.genere) {
      await sql`
        update menu_items set kind = ${cat.genere}
         where venue_id = ${venueId} and category_id = ${id} and kind = 'food'`;
    }

    if (cat.fuoriFormula) {
      await sql`
        update menu_items set fuori_formula = true
         where venue_id = ${venueId} and category_id = ${id}
           and fuori_formula = false`;
    }
  }

  /*
   * Un locale appena registrato ha quelle categorie vuote, quindi l'update
   * qui sopra non tocca niente: le bevande e i dolci caricati DOPO nascono
   * dentro il prezzo fisso, e con la formula attiva il conto non li addebita
   * — quaranta coperti a due turni che bevono gratis, senza nessun errore da
   * nessuna parte. L'update è già scritto `where fuori_formula = false`,
   * quindi riapplicare il formato sistema tutto: l'unica cosa che manca è
   * dirlo, e questo è il momento in cui il ristoratore sta guardando.
   */
  let avvisaRiapplica = false;
  const catFuoriFormula = modello.categorie.filter((c) => c.fuoriFormula);
  const idFuoriFormula = catFuoriFormula
    .map((c) => perNome.get(c.nome.toLowerCase()))
    .filter((id): id is string => Boolean(id));

  if (idFuoriFormula.length > 0) {
    const [conteggio] = await sql<{ n: number }[]>`
      select count(*)::int as n from menu_items
       where venue_id = ${venueId} and category_id in ${sql(idFuoriFormula)}`;
    avvisaRiapplica = (conteggio?.n ?? 0) === 0;
  }

  /* Le categorie si nominano invece di dire genericamente "le bevande": in
     una gintoneria a restare a pagamento sono Gin tonic e Distillati, e un
     avviso che parla d'altro non lo legge nessuno. */
  const notaRiapplica = avvisaRiapplica
    ? t("applica.nota.riapplica", {
        elenco: t.elenco(catFuoriFormula.map((c) => c.nome)),
      })
    : "";

  if (soloCategorie) {
    revalidatePath("/dashboard/menu");
    return {
      success:
        (categorieCreate > 0
          ? t.n(categorieCreate, "applica.solo_categorie")
          : t("applica.solo_categorie.nessuna")) + notaRiapplica,
    };
  }

  // I gruppi si applicano ai piatti già presenti nelle categorie previste:
  // su un menu vuoto non c'è nulla a cui attaccarli, ed è normale.
  /*
   * Il listino di partenza nasce spento.
   *
   * Serve a non far battere sessanta nomi a mano il primo giorno, e
   * soprattutto a non far compilare sessanta volte gli allergeni — l'obbligo
   * che costa da 3.000 a 24.000 euro e la cosa che nessuno ha voglia di
   * fare. Ma i prezzi sono indicativi e sbagliati per definizione: un
   * ristorante di Milano e uno di paese non hanno lo stesso listino.
   *
   * Quindi `available = false`: nessuna di queste voci raggiunge un cliente
   * finché il ristoratore non l'ha aperta, corretta e accesa. Un listino
   * finto pubblicato per sbaglio è peggio di un menu vuoto.
   */
  let piattiCreati = 0;
  /* Il giro di aliquota, genere e fuori formula qui sopra è già passato: le
     voci del listino nascono dopo, quindi i loro valori vanno scritti
     nell'insert. Senza, il sake del listino nascerebbe al 10% e dentro il
     prezzo fisso. */
  const perCategoria = new Map(
    modello.categorie.map((c) => [c.nome.toLowerCase(), c])
  );
  if (conListino && modello.piatti?.length) {
    for (const [i, piatto] of modello.piatti.entries()) {
      const catId = perNome.get(piatto.categoria.toLowerCase());
      if (!catId) continue;
      const cat = perCategoria.get(piatto.categoria.toLowerCase());

      // Non si duplica quello che c'è già: chi riapplica il formato non deve
      // ritrovarsi il menu doppio.
      const [gia] = await sql<{ id: string }[]>`
        select id from menu_items
         where venue_id = ${venueId} and lower(name) = lower(${piatto.nome})`;
      if (gia) continue;

      await sql`
        insert into menu_items
          (venue_id, category_id, name, description, price_cents, allergens,
           available, sort_order, vat_rate, kind, fuori_formula, conservation)
        values (${venueId}, ${catId}, ${piatto.nome},
                ${piatto.descrizione ?? null}, ${piatto.prezzo},
                ${piatto.allergeni ?? []}, false, ${i},
                ${cat?.iva ?? 10}, ${cat?.genere ?? "food"},
                ${cat?.fuoriFormula ?? false},
                ${piatto.conservazione ?? "fresco"})`;
      piattiCreati += 1;
    }
  }

  let gruppiCreati = 0;

  for (const g of modello.gruppi) {
    const idCategorie = g.categorie
      .map((n) => perNome.get(n.toLowerCase()))
      .filter((id): id is string => Boolean(id));

    if (idCategorie.length === 0) continue;

    const piatti = await sql<{ id: string }[]>`
      select id from menu_items
       where venue_id = ${venueId}
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
        values (${venueId}, ${p.id}, ${g.nome}, ${g.tipo},
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

  const notaListino =
    piattiCreati > 0 ? t.n(piattiCreati, "applica.nota.listino") : "";

  const notaIva = ritoccati > 0 ? t.n(ritoccati, "applica.nota.iva") : "";

  const nota = modo?.alBanco ? t("applica.nota.banco") : "";

  if (categorieCreate === 0 && gruppiCreati === 0) {
    return {
      success:
        t("applica.nulla") + nota + notaIva + notaListino + notaRiapplica,
    };
  }

  return {
    success:
      t("applica.fatto", {
        categorie: t.n(categorieCreate, "applica.fatto.categorie"),
        gruppi: t.n(gruppiCreati, "applica.fatto.gruppi"),
      }) +
      nota +
      notaIva +
      notaListino +
      notaRiapplica,
  };
}

