"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";

export async function addCategory(formData: FormData) {
  const { venue } = await requireVenue();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const sql = db();
  await sql`insert into menu_categories (venue_id, name, sort_order)
    values (${venue.venueId}, ${name}, 0)`;
  revalidatePath("/dashboard/menu");
}

export async function addMenuItem(formData: FormData) {
  const { venue } = await requireVenue();
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const priceEuro = Number.parseFloat(String(formData.get("price") ?? "0"));
  if (!name || !Number.isFinite(priceEuro) || priceEuro < 0) return;

  const sql = db();

  // Il piatto deve appartenere allo stesso venue di chi chiama — la
  // categoria arriva dal client, va rivalidata qui prima di fidarsene.
  if (categoryId) {
    const [cat] = await sql<{ id: string }[]>`
      select id from menu_categories where id = ${categoryId} and venue_id = ${venue.venueId}`;
    if (!cat) return;
  }

  await sql`
    insert into menu_items (venue_id, category_id, name, price_cents, sort_order)
    values (${venue.venueId}, ${categoryId}, ${name}, ${Math.round(priceEuro * 100)}, 0)`;
  revalidatePath("/dashboard/menu");
}

export async function toggleItemAvailable(itemId: string, available: boolean) {
  const { venue } = await requireVenue();
  const sql = db();
  await sql`
    update menu_items set available = ${available}
    where id = ${itemId} and venue_id = ${venue.venueId}`;
  revalidatePath("/dashboard/menu");
}

export async function deleteMenuItem(itemId: string) {
  const { venue } = await requireVenue();
  const sql = db();
  await sql`delete from menu_items where id = ${itemId} and venue_id = ${venue.venueId}`;
  revalidatePath("/dashboard/menu");
}
