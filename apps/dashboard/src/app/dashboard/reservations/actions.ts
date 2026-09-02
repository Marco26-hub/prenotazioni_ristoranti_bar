"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";

export async function addReservation(formData: FormData) {
  const { venue } = await requireVenue();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const partySize = Number.parseInt(String(formData.get("partySize") ?? "0"), 10);
  const reservedAt = String(formData.get("reservedAt") ?? "");
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!customerName || !Number.isFinite(partySize) || partySize < 1 || !reservedAt) return;

  const sql = db();
  await sql`
    insert into reservations (venue_id, customer_name, customer_phone, party_size, reserved_at)
    values (${venue.venueId}, ${customerName}, ${phone}, ${partySize}, ${reservedAt})`;
  revalidatePath("/dashboard/reservations");
}

export async function cancelReservation(reservationId: string) {
  const { venue } = await requireVenue();
  const sql = db();
  await sql`
    update reservations set status = 'cancelled'
    where id = ${reservationId} and venue_id = ${venue.venueId}`;
  revalidatePath("/dashboard/reservations");
}
