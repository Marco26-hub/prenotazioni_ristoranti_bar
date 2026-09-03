"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { decryptSecret } from "@repo/shared/crypto";
import { getTilbyCategories, getTilbyItems } from "@repo/shared/tilby";
import { requireRole } from "@/lib/authz";
import { messaggioErrore } from "@repo/shared/errori";

export interface TilbyImportResult {
  error?: string;
  created?: number;
  updated?: number;
  skipped?: string[];
}

/**
 * Importa il menu dal gestionale di cassa del locale.
 *
 * È un aggiornamento, non una sostituzione: i piatti già presenti vengono
 * riallineati per prezzo e disponibilità, gli altri aggiunti. Cancellare e
 * ricaricare romperebbe lo storico ordini, che punta a menu_items.
 *
 * Il prezzo in Tilby (`price1`) è espresso in euro con decimali; qui si
 * lavora in centesimi interi, quindi va convertito una volta sola.
 */
export async function importMenuFromTilby(): Promise<TilbyImportResult> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();

  const [row] = await sql<{ tilby_token: string | null }[]>`
    select tilby_token from venues where id = ${venue.venueId}`;

  if (!row?.tilby_token) {
    return { error: "Tilby non è collegato: impostalo prima in Impostazioni" };
  }

  const token = decryptSecret(row.tilby_token);

  let tilbyCategories, tilbyItems;
  try {
    [tilbyCategories, tilbyItems] = await Promise.all([
      getTilbyCategories(token),
      getTilbyItems(token),
    ]);
  } catch (err) {
    console.error(`[tilby-import] lettura fallita: ${messaggioErrore(err)}`);
    return { error: err instanceof Error ? err.message : "Errore lettura da Tilby" };
  }

  // Le categorie si allineano per nome: è l'unico riferimento stabile fra i
  // due sistemi, gli id sono di Tilby e non hanno senso da noi.
  const existingCategories = await sql<{ id: string; name: string }[]>`
    select id, name from menu_categories where venue_id = ${venue.venueId}`;
  const categoryByName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));
  const localCategoryByTilbyId = new Map<number, string>();

  for (const cat of tilbyCategories) {
    const key = cat.name.trim().toLowerCase();
    let localId = categoryByName.get(key);
    if (!localId) {
      const [created] = await sql<{ id: string }[]>`
        insert into menu_categories (venue_id, name, sort_order)
        values (${venue.venueId}, ${cat.name.trim()}, ${cat.index ?? 0})
        returning id`;
      localId = created.id;
      categoryByName.set(key, localId);
    }
    localCategoryByTilbyId.set(cat.id, localId);
  }

  const existingItems = await sql<{ id: string; name: string }[]>`
    select id, name from menu_items where venue_id = ${venue.venueId}`;
  const itemByName = new Map(existingItems.map((i) => [i.name.toLowerCase(), i.id]));

  const skipped: string[] = [];
  let created = 0;
  let updated = 0;

  for (const [index, item] of tilbyItems.entries()) {
    const name = item.name?.trim();
    if (!name) {
      skipped.push(`articolo Tilby ${item.id}: senza nome`);
      continue;
    }
    if (typeof item.price1 !== "number" || item.price1 < 0) {
      skipped.push(`${name}: prezzo non valido in cassa`);
      continue;
    }

    const priceCents = Math.round(item.price1 * 100);
    const vatRate = typeof item.vat_perc === "number" ? item.vat_perc : 10;
    const categoryId = item.category_id
      ? (localCategoryByTilbyId.get(item.category_id) ?? null)
      : null;

    const existingId = itemByName.get(name.toLowerCase());

    if (existingId) {
      await sql`
        update menu_items set price_cents = ${priceCents}, vat_rate = ${vatRate},
          description = ${item.description?.trim() || null},
          category_id = ${categoryId}, available = true
        where id = ${existingId} and venue_id = ${venue.venueId}`;
      updated++;
    } else {
      await sql`
        insert into menu_items (venue_id, category_id, name, description,
                                price_cents, vat_rate, sort_order)
        values (${venue.venueId}, ${categoryId}, ${name},
                ${item.description?.trim() || null}, ${priceCents}, ${vatRate}, ${index})`;
      created++;
    }
  }

  revalidatePath("/dashboard/menu");
  return { created, updated, skipped };
}
