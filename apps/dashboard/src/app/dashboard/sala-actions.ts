"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";

/**
 * Coperti del tavolo.
 *
 * La colonna esisteva da sempre con valore 1 e non la scriveva nessuno:
 * qualunque analisi su scontrino medio per coperto restituiva quindi il
 * totale del tavolo. Senza questo dato l'unico numero utile a un
 * ristoratore — quanto spende una persona — non è calcolabile.
 */
export async function impostaCoperti(sessionId: string, coperti: number) {
  const { venue } = await requireVenue();

  if (!Number.isInteger(coperti) || coperti < 1 || coperti > 50) return;

  const sql = db();
  await sql`
    update table_sessions set guest_count = ${coperti}
    where id = ${sessionId} and venue_id = ${venue.venueId}`;

  revalidatePath("/dashboard");
}
