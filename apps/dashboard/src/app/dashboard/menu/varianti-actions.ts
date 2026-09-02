"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";

export interface EsitoVariante {
  error?: string;
  success?: string;
}

/**
 * Crea un gruppo di scelte su un piatto.
 *
 * "Quanti pezzi" con una scelta obbligatoria, "Aggiunte" con più scelte
 * facoltative: la stessa struttura copre le varianti di formato e i
 * supplementi, che dal punto di vista dell'ordine sono la stessa cosa.
 */
export async function creaGruppo(formData: FormData): Promise<EsitoVariante> {
  const { venue } = await requireRole(["owner", "manager"]);

  const itemId = String(formData.get("itemId") ?? "");
  const nome = String(formData.get("name") ?? "").trim();
  const obbligatorio = formData.get("required") === "on";
  const multiplo = formData.get("multiple") === "on";

  if (!itemId || !nome) return { error: "Serve un nome per il gruppo" };

  const sql = db();
  const [piatto] = await sql<{ id: string }[]>`
    select id from menu_items where id = ${itemId} and venue_id = ${venue.venueId}`;
  if (!piatto) return { error: "Piatto non trovato" };

  await sql`
    insert into menu_option_groups
      (venue_id, menu_item_id, name, required, min_choices, max_choices, sort_order)
    values (${venue.venueId}, ${itemId}, ${nome}, ${obbligatorio},
            ${obbligatorio ? 1 : 0}, ${multiplo ? 10 : 1},
            coalesce((select max(sort_order) + 1 from menu_option_groups
                       where menu_item_id = ${itemId}), 0))`;

  revalidatePath("/dashboard/menu");
  return { success: "Gruppo creato: ora aggiungi le scelte." };
}

export async function eliminaGruppo(groupId: string): Promise<EsitoVariante> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();
  await sql`
    delete from menu_option_groups
     where id = ${groupId} and venue_id = ${venue.venueId}`;
  revalidatePath("/dashboard/menu");
  return { success: "Gruppo eliminato" };
}

export async function creaOpzione(formData: FormData): Promise<EsitoVariante> {
  const { venue } = await requireRole(["owner", "manager"]);

  const groupId = String(formData.get("groupId") ?? "");
  const nome = String(formData.get("name") ?? "").trim();
  const delta = Number.parseFloat(String(formData.get("delta") ?? "0"));

  if (!groupId || !nome) return { error: "Serve un nome per la scelta" };
  if (!Number.isFinite(delta)) return { error: "Supplemento non valido" };

  const sql = db();
  // Il gruppo va riverificato contro il venue: l'id arriva dal client.
  const [gruppo] = await sql<{ id: string }[]>`
    select id from menu_option_groups
     where id = ${groupId} and venue_id = ${venue.venueId}`;
  if (!gruppo) return { error: "Gruppo non trovato" };

  await sql`
    insert into menu_options (group_id, name, price_delta_cents, sort_order)
    values (${groupId}, ${nome}, ${Math.round(delta * 100)},
            coalesce((select max(sort_order) + 1 from menu_options
                       where group_id = ${groupId}), 0))`;

  revalidatePath("/dashboard/menu");
  return { success: "Scelta aggiunta" };
}

export async function eliminaOpzione(optionId: string): Promise<EsitoVariante> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();
  await sql`
    delete from menu_options
     where id = ${optionId}
       and group_id in (select id from menu_option_groups
                         where venue_id = ${venue.venueId})`;
  revalidatePath("/dashboard/menu");
  return { success: "Scelta eliminata" };
}

/** Esaurito per stasera: si nasconde senza perdere la configurazione. */
export async function commutaOpzione(
  optionId: string,
  disponibile: boolean
): Promise<EsitoVariante> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();
  await sql`
    update menu_options set available = ${disponibile}
     where id = ${optionId}
       and group_id in (select id from menu_option_groups
                         where venue_id = ${venue.venueId})`;
  revalidatePath("/dashboard/menu");
  return {};
}
