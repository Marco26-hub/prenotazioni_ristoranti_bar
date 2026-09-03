"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";

/**
 * Il locale chiede assistenza dal proprio gestionale.
 *
 * Sta qui e non su WhatsApp perché una richiesta che vive nel telefono di
 * chi l'ha ricevuta non si può contare né riprendere: non si sa quante ne
 * arrivano, quali sono rimaste aperte, né quali locali stanno soffrendo.
 */
export async function apriTicket(
  formData: FormData
): Promise<{ ok?: string; error?: string }> {
  const { venue, userId } = await requireVenue();

  const oggetto = String(formData.get("oggetto") ?? "").trim();
  const messaggio = String(formData.get("messaggio") ?? "").trim();
  const urgenza = String(formData.get("urgenza") ?? "normale");

  if (!oggetto || !messaggio) return { error: "Scrivi oggetto e messaggio" };
  if (!["normale", "blocca_servizio"].includes(urgenza)) {
    return { error: "Urgenza non valida" };
  }

  const sql = db();
  const [u] = await sql<{ etichetta: string }[]>`
    select coalesce(name, email) as etichetta from users where id = ${userId}`;

  // Una richiesta identica ancora aperta non se ne apre una seconda: chi non
  // vede risposta riscrive, ed è comprensibile, ma raddoppiare la coda non
  // aiuta nessuno.
  const [gia] = await sql<{ id: string }[]>`
    select id from support_tickets
     where venue_id = ${venue.venueId} and stato <> 'risolto'
       and oggetto = ${oggetto.slice(0, 120)}`;

  if (gia) {
    return { ok: "Hai già una richiesta aperta con questo oggetto: la stiamo guardando." };
  }

  await sql`
    insert into support_tickets
      (venue_id, aperto_da, aperto_da_label, oggetto, messaggio, urgenza)
    values (${venue.venueId}, ${userId}, ${u?.etichetta ?? "staff"},
            ${oggetto.slice(0, 120)}, ${messaggio.slice(0, 4000)}, ${urgenza})`;

  revalidatePath("/dashboard/assistenza");
  return { ok: "Richiesta inviata. Ti rispondiamo qui dentro." };
}
