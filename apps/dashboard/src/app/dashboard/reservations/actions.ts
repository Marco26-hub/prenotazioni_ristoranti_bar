"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";
import { inviaEmail } from "@repo/shared/email";
import { slotAlternativi, formattaOrario } from "@repo/shared/prenotazioni";

export interface EsitoPrenotazione {
  error?: string;
  avviso?: string;
  ok?: boolean;
}

type Stato = "pending" | "confirmed" | "seated" | "no_show" | "cancelled" | "declined";

interface RigaPrenotazione {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  party_size: number;
  reserved_at: Date;
  notes: string | null;
  status: Stato;
}

interface RigaLocale {
  name: string;
  slug: string;
  timezone: string | null;
  reservation_email: string | null;
  public_email: string | null;
  public_phone: string | null;
}

async function caricaContesto(venueId: string, reservationId: string) {
  const sql = db();
  const [prenotazione] = await sql<RigaPrenotazione[]>`
    select id, customer_name, customer_email, customer_phone, party_size,
           reserved_at, notes, status
      from reservations
     where id = ${reservationId} and venue_id = ${venueId}`;

  const [locale] = await sql<RigaLocale[]>`
    select name, slug, timezone, reservation_email, public_email, public_phone
      from venues where id = ${venueId}`;

  return { sql, prenotazione, locale };
}

/**
 * Registra l'esito dell'avviso al cliente accanto alla prenotazione.
 *
 * Un errore di invio non deve annullare la decisione presa: il tavolo è
 * confermato comunque, ma il locale deve vedere che il cliente non l'ha
 * saputo, così può telefonare.
 */
async function segnaAvviso(
  sql: ReturnType<typeof db>,
  id: string,
  esito: { inviata: boolean; errore?: string }
) {
  await sql`
    update reservations set
      guest_notified_at = ${esito.inviata ? sql`now()` : null},
      guest_notify_error = ${esito.errore ?? null}
    where id = ${id}`;
}

export async function confermaPrenotazione(
  reservationId: string
): Promise<EsitoPrenotazione> {
  const { venue, userId } = await requireVenue();
  const { sql, prenotazione, locale } = await caricaContesto(venue.venueId, reservationId);

  if (!prenotazione) return { error: "Prenotazione non trovata" };

  await sql`
    update reservations
       set status = 'confirmed', confirmed_at = now(), responded_by = ${userId},
           decline_reason = null
     where id = ${reservationId} and venue_id = ${venue.venueId}`;

  let avviso: string | undefined;

  if (prenotazione.customer_email) {
    const quando = formattaOrario(prenotazione.reserved_at, locale?.timezone ?? "Europe/Rome");
    const esito = await inviaEmail({
      a: prenotazione.customer_email,
      rispondiA: locale?.reservation_email ?? locale?.public_email ?? undefined,
      oggetto: `Prenotazione confermata — ${locale?.name ?? "il ristorante"}`,
      testo: [
        `Ciao ${prenotazione.customer_name},`,
        "",
        `la tua prenotazione da ${locale?.name ?? "noi"} è confermata.`,
        "",
        `Quando: ${quando}`,
        `Persone: ${prenotazione.party_size}`,
        prenotazione.notes ? `Richieste: ${prenotazione.notes}` : null,
        "",
        locale?.public_phone
          ? `Per qualsiasi cambiamento chiamaci al ${locale.public_phone}.`
          : "Per qualsiasi cambiamento rispondi a questa email.",
      ]
        .filter((r) => r !== null)
        .join("\n"),
    });

    await segnaAvviso(sql, reservationId, esito);
    if (!esito.inviata) {
      avviso = `Confermata, ma l'email al cliente non è partita: ${esito.errore}. Chiamalo${
        prenotazione.customer_phone ? ` al ${prenotazione.customer_phone}` : ""
      }.`;
    }
  } else {
    avviso = `Confermata. Il cliente non ha lasciato un'email: avvisalo${
      prenotazione.customer_phone ? ` al ${prenotazione.customer_phone}` : " tu"
    }.`;
  }

  revalidatePath("/dashboard/reservations");
  return { ok: true, avviso };
}

/**
 * Rifiuto con motivo e orari alternativi.
 *
 * Un "non c'è posto" secco fa perdere il cliente. Proporgli due orari in cui
 * il posto c'è davvero lo trattiene, e le alternative sono calcolate sulla
 * disponibilità reale, non inventate.
 */
export async function rifiutaPrenotazione(
  reservationId: string,
  motivo: string
): Promise<EsitoPrenotazione> {
  const { venue, userId } = await requireVenue();
  const { sql, prenotazione, locale } = await caricaContesto(venue.venueId, reservationId);

  if (!prenotazione) return { error: "Prenotazione non trovata" };

  const testoMotivo = motivo.trim().slice(0, 300) || "Non abbiamo disponibilità per quell'orario.";

  await sql`
    update reservations
       set status = 'declined', decline_reason = ${testoMotivo}, responded_by = ${userId}
     where id = ${reservationId} and venue_id = ${venue.venueId}`;

  let avviso: string | undefined;

  if (prenotazione.customer_email) {
    const fuso = locale?.timezone ?? "Europe/Rome";
    const alternative = await slotAlternativi(
      sql,
      venue.venueId,
      prenotazione.reserved_at,
      prenotazione.party_size
    );

    const urlPrenota = `${process.env.GUEST_APP_URL ?? "https://ristoranti-guest.vercel.app"}/p/${locale?.slug ?? ""}`;

    const esito = await inviaEmail({
      a: prenotazione.customer_email,
      rispondiA: locale?.reservation_email ?? locale?.public_email ?? undefined,
      oggetto: `Prenotazione non disponibile — ${locale?.name ?? "il ristorante"}`,
      testo: [
        `Ciao ${prenotazione.customer_name},`,
        "",
        `purtroppo per ${formattaOrario(prenotazione.reserved_at, fuso)} non possiamo accogliere ${prenotazione.party_size} persone.`,
        "",
        testoMotivo,
        "",
        alternative.length > 0
          ? ["Abbiamo posto in questi orari:", ...alternative.map((d) => `— ${formattaOrario(d, fuso)}`)].join("\n")
          : "Puoi provare un altro giorno o un altro orario.",
        "",
        `Prenota qui: ${urlPrenota}`,
        locale?.public_phone ? `Oppure chiamaci al ${locale.public_phone}.` : null,
        "",
        "Ci dispiace, e ci farebbe piacere vederti presto.",
      ]
        .filter((r) => r !== null)
        .join("\n"),
    });

    await segnaAvviso(sql, reservationId, esito);
    if (!esito.inviata) {
      avviso = `Rifiutata, ma l'email al cliente non è partita: ${esito.errore}. Chiamalo${
        prenotazione.customer_phone ? ` al ${prenotazione.customer_phone}` : ""
      }.`;
    }
  } else {
    avviso = `Rifiutata. Il cliente non ha lasciato un'email: avvisalo${
      prenotazione.customer_phone ? ` al ${prenotazione.customer_phone}` : " tu"
    }.`;
  }

  revalidatePath("/dashboard/reservations");
  return { ok: true, avviso };
}

/** Inserimento manuale dallo staff: nasce già confermata, l'ha presa una persona. */
export async function addReservation(formData: FormData) {
  const { venue } = await requireVenue();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const partySize = Number.parseInt(String(formData.get("partySize") ?? "0"), 10);
  const reservedAt = String(formData.get("reservedAt") ?? "");
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 300) || null;

  if (!customerName || !Number.isFinite(partySize) || partySize < 1 || !reservedAt) return;

  const sql = db();
  await sql`
    insert into reservations (venue_id, customer_name, customer_phone, customer_email,
                              party_size, reserved_at, notes, status, confirmed_at)
    values (${venue.venueId}, ${customerName}, ${phone}, ${email}, ${partySize},
            ${reservedAt}, ${notes}, 'confirmed', now())`;
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

/**
 * Segnare arrivo e no-show serve al locale per sapere su chi può contare:
 * il no-show è anche il presupposto per addebitare la caparra, quando sarà
 * attiva.
 */
export async function setReservationStatus(reservationId: string, status: Stato) {
  const { venue } = await requireVenue();
  const sql = db();
  await sql`
    update reservations set status = ${status}
    where id = ${reservationId} and venue_id = ${venue.venueId}`;
  revalidatePath("/dashboard/reservations");
}
