"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";

export async function addTable(formData: FormData) {
  const { venue } = await requireVenue();
  const code = String(formData.get("code") ?? "").trim();
  const seats = Number.parseInt(String(formData.get("seats") ?? "2"), 10);
  if (!code || !Number.isFinite(seats) || seats < 1) return;

  const sql = db();
  await sql`insert into tables (venue_id, code, seats) values (${venue.venueId}, ${code}, ${seats})`;
  revalidatePath("/dashboard/tables");
}

export async function toggleTableActive(tableId: string, active: boolean) {
  const { venue } = await requireVenue();
  const sql = db();
  await sql`update tables set active = ${active} where id = ${tableId} and venue_id = ${venue.venueId}`;
  revalidatePath("/dashboard/tables");
}
