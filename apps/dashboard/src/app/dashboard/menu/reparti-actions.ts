"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { REPARTI } from "@repo/shared/reparti";

export interface EsitoReparti {
  error?: string;
  ok?: string;
}

/** Da "Banco sushi" a "banco-sushi": la chiave non cambia mai, l'etichetta sì. */
function chiaveDa(etichetta: string): string {
  return etichetta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/**
 * Aggiunge una postazione al locale.
 *
 * Alla prima aggiunta l'elenco smette di essere quello di partenza e diventa
 * suo: per questo i sei predefiniti vengono scritti insieme al nuovo, o
 * aggiungendo "Forno" il locale si ritroverebbe con il forno e basta, e ogni
 * categoria puntata a una postazione che non esiste più.
 */
export async function aggiungiReparto(etichetta: string): Promise<EsitoReparti> {
  const { venue } = await requireRole(["owner", "manager"]);

  const nome = etichetta.trim().slice(0, 40);
  if (nome.length < 2) return { error: "Serve un nome di almeno due lettere" };

  const chiave = chiaveDa(nome);
  if (!chiave) return { error: "Nome non utilizzabile: usa lettere e numeri" };

  const sql = db();

  const [quante] = await sql<{ n: string }[]>`
    select count(*)::text as n from venue_reparti where venue_id = ${venue.venueId}`;

  if (Number(quante.n) === 0) {
    for (const [i, r] of REPARTI.entries()) {
      await sql`
        insert into venue_reparti (venue_id, chiave, etichetta, sort_order)
        values (${venue.venueId}, ${r.chiave}, ${r.etichetta}, ${i})
        on conflict (venue_id, chiave) do nothing`;
    }
  }

  const righe = await sql`
    insert into venue_reparti (venue_id, chiave, etichetta, sort_order)
    values (${venue.venueId}, ${chiave}, ${nome},
            coalesce((select max(sort_order) + 1 from venue_reparti
                       where venue_id = ${venue.venueId}), 0))
    on conflict (venue_id, chiave) do nothing
    returning chiave`;

  revalidatePath("/dashboard/menu");
  revalidatePath("/dashboard/staff");

  return righe.length > 0
    ? { ok: `"${nome}" aggiunta.` }
    : { error: "Esiste già una postazione con questo nome" };
}

/** Rinomina: la chiave resta, o si toglierebbe il permesso a chi ce l'ha. */
export async function rinominaReparto(
  chiave: string,
  etichetta: string
): Promise<EsitoReparti> {
  const { venue } = await requireRole(["owner", "manager"]);

  const nome = etichetta.trim().slice(0, 40);
  if (nome.length < 2) return { error: "Serve un nome di almeno due lettere" };

  const sql = db();
  const righe = await sql`
    update venue_reparti set etichetta = ${nome}
     where venue_id = ${venue.venueId} and chiave = ${chiave}
    returning chiave`;

  if (righe.length === 0) return { error: "Postazione non trovata" };

  revalidatePath("/dashboard/menu");
  revalidatePath("/dashboard/staff");
  return { ok: "Rinominata." };
}

/**
 * Toglie una postazione.
 *
 * Non si toglie quella su cui ci sono ancora categorie: le loro comande
 * finirebbero su uno schermo che non esiste, e nessuno le vedrebbe più.
 */
export async function togliReparto(chiave: string): Promise<EsitoReparti> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();

  const [usata] = await sql<{ n: string }[]>`
    select count(*)::text as n from menu_categories
     where venue_id = ${venue.venueId} and reparto = ${chiave}`;

  if (Number(usata.n) > 0) {
    return {
      error: `Ci sono ancora ${usata.n} categorie su questa postazione: spostale prima, o le loro comande non le vedrebbe più nessuno.`,
    };
  }

  await sql`
    delete from venue_reparti
     where venue_id = ${venue.venueId} and chiave = ${chiave}`;

  revalidatePath("/dashboard/menu");
  revalidatePath("/dashboard/staff");
  return { ok: "Tolta." };
}

/** Dove si prepara una categoria. */
export async function impostaRepartoCategoria(
  categoryId: string,
  chiave: string
): Promise<EsitoReparti> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();

  const righe = await sql`
    update menu_categories set reparto = ${chiave}
     where id = ${categoryId} and venue_id = ${venue.venueId}
    returning id`;

  if (righe.length === 0) return { error: "Categoria non trovata" };

  revalidatePath("/dashboard/menu");
  revalidatePath("/dashboard/orders");
  return { ok: "Spostata." };
}
