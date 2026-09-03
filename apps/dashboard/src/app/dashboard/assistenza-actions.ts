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
  // Una casella non spuntata non manda niente, non manda "normale".
  const urgenza =
    formData.get("urgenza") === "blocca_servizio" ? "blocca_servizio" : "normale";

  if (!oggetto || !messaggio) return { error: "Scrivi oggetto e messaggio" };
  const sql = db();
  const [u] = await sql<{ etichetta: string }[]>`
    select coalesce(name, email) as etichetta from users where id = ${userId}`;

  /*
   * Il duplicato non si scarta: si aggiorna quello che c'è.
   *
   * Prima usciva subito con un `ok`, che il form mostra in verde come un
   * invio riuscito. Il locale rileggeva la propria vecchia richiesta e ne
   * ricavava la conferma che era arrivata — mentre il nuovo messaggio non
   * era stato scritto da nessuna parte. Il caso che conta è proprio questo:
   * sabato sera lo stesso problema torna, il titolare riscrive lo stesso
   * oggetto e spunta "blocca il servizio", e quella spunta si perdeva. Nel
   * pannello il ticket restava 'normale' e non saliva in cima, con il
   * ristorante fermo.
   *
   * Se invece una risposta l'ha già ricevuta e riscrive, sta dicendo che la
   * risposta non ha risolto: la conversazione continua in una richiesta
   * nuova, perché la risposta è un campo solo.
   */
  const [gia] = await sql<{ id: string; urgenza: string }[]>`
    select id, urgenza from support_tickets
     where venue_id = ${venue.venueId} and stato <> 'risolto'
       and risposta is null
       and oggetto = ${oggetto.slice(0, 120)}`;

  if (gia) {
    const saleUrgenza = urgenza === "blocca_servizio" && gia.urgenza !== "blocca_servizio";
    await sql`
      update support_tickets
         set messaggio = left(messaggio || E'\n\n— riscritto —\n' || ${messaggio.slice(0, 4000)}, 8000),
             urgenza = ${urgenza === "blocca_servizio" ? "blocca_servizio" : sql`urgenza`},
             stato = 'aperto'
       where id = ${gia.id}`;

    revalidatePath("/dashboard/assistenza");
    return {
      ok: saleUrgenza
        ? "Aggiunto alla richiesta che avevi già aperto, segnalata come urgente."
        : "Aggiunto alla richiesta che avevi già aperto: la stiamo guardando.",
    };
  }

  await sql`
    insert into support_tickets
      (venue_id, aperto_da, aperto_da_label, oggetto, messaggio, urgenza)
    values (${venue.venueId}, ${userId}, ${u?.etichetta ?? "staff"},
            ${oggetto.slice(0, 120)}, ${messaggio.slice(0, 4000)}, ${urgenza})`;

  revalidatePath("/dashboard/assistenza");
  return { ok: "Richiesta inviata. Ti rispondiamo qui dentro." };
}
