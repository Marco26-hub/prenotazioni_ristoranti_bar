"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";
import { inviaEmail } from "@repo/shared/email";
import { linkDisdetta, nuovoTokenDisdetta } from "@repo/shared/prenotazioni-token";
import { decryptSecret } from "@repo/shared/crypto";
import {
  assegnaTavoliPrenotazione,
  slotAlternativi,
  interpretaOrario,
} from "@repo/shared/prenotazioni";
import { normalizzaLinguaUI } from "@repo/shared/i18n";
import { linguaUtente } from "@/lib/lingua";
import { tPrenotazioni, orarioLungo } from "@/i18n/prenotazioni";

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
  /** Null sulle prenotazioni nate prima della disdetta autonoma. */
  cancel_token: string | null;
  /** La lingua di chi ha prenotato, non di chi sta al gestionale. */
  lingua: string;
}

interface RigaLocale {
  name: string;
  slug: string;
  timezone: string | null;
  reservation_email: string | null;
  public_email: string | null;
  public_phone: string | null;
  resend_api_key: string | null;
  resend_from: string | null;
}

/** Credenziali proprie del locale, se ne ha e se sono leggibili. */
function mittenteDi(locale: RigaLocale | undefined) {
  if (!locale?.resend_api_key || !locale.resend_from) return undefined;
  try {
    return { apiKey: decryptSecret(locale.resend_api_key), from: locale.resend_from };
  } catch {
    console.error(`[prenotazioni] chiave email illeggibile per ${locale.slug}`);
    return undefined;
  }
}

async function caricaContesto(venueId: string, reservationId: string) {
  const sql = db();
  const [prenotazione] = await sql<RigaPrenotazione[]>`
    select id, customer_name, customer_email, customer_phone, party_size,
           reserved_at, notes, status, cancel_token, lingua
      from reservations
     where id = ${reservationId} and venue_id = ${venueId}`;


  const [locale] = await sql<RigaLocale[]>`
    select name, slug, timezone, reservation_email, public_email, public_phone,
           resend_api_key, resend_from
      from venues where id = ${venueId}`;

  return { sql, prenotazione, locale };
}

/**
 * La lingua in cui scrivere al cliente.
 *
 * Sta sulla riga della prenotazione e non sull'utente collegato: al
 * gestionale c'è il ristoratore, l'email la legge chi ha prenotato. Il
 * ripiego è l'italiano, come il default della colonna.
 */
function linguaCliente(prenotazione: RigaPrenotazione) {
  return normalizzaLinguaUI(prenotazione.lingua) ?? "it";
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
  const t = tPrenotazioni(await linguaUtente());
  const { sql, prenotazione, locale } = await caricaContesto(venue.venueId, reservationId);

  if (!prenotazione) return { error: t("errore.non_trovata") };

  /*
   * Una richiesta già chiusa non si riapre confermandola.
   *
   * Il cliente può aver disdetto dal link mentre la pagina era aperta:
   * confermare senza guardare lo stato la resuscitava, gli mandava la
   * conferma di un tavolo che aveva annullato, e da quel momento il suo
   * link non funzionava più — restava solo il telefono.
   */
  if (["cancelled", "declined", "seated", "no_show"].includes(prenotazione.status)) {
    return {
      error:
        prenotazione.status === "cancelled"
          ? t("errore.disdetta_dal_cliente")
          : t("errore.gia_chiusa"),
    };
  }

  const tavoli = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${venue.venueId}))`;
    const assegnati = await assegnaTavoliPrenotazione(
      tx,
      reservationId,
      venue.venueId,
      prenotazione.reserved_at,
      prenotazione.party_size
    );
    if (assegnati.length === 0) return [];

    await tx`
      update reservations
         set status = 'confirmed', confirmed_at = now(), responded_by = ${userId},
             decline_reason = null
       where id = ${reservationId} and venue_id = ${venue.venueId}`;
    return assegnati;
  });

  if (tavoli.length === 0) {
    return { error: t("errore.nessun_tavolo_fascia") };
  }
  const tavoliTesto = tavoli.map((t) => t.code).join(" + ");

  let avviso: string | undefined;

  if (prenotazione.customer_email) {
    // L'email la legge il cliente: va nella sua lingua, non in quella di chi
    // ha premuto Conferma.
    const tc = tPrenotazioni(linguaCliente(prenotazione));
    const quando = orarioLungo(
      prenotazione.reserved_at,
      locale?.timezone ?? "Europe/Rome",
      tc.lingua
    );
    const esito = await inviaEmail({
      a: prenotazione.customer_email,
      rispondiA: locale?.reservation_email ?? locale?.public_email ?? undefined,
      mittenteLocale: mittenteDi(locale),
      oggetto: tc("email.conferma.oggetto", {
        locale: locale?.name ?? tc("email.locale.ripiego"),
      }),
      testo: [
        tc("email.saluto", { nome: prenotazione.customer_name }),
        "",
        tc("email.conferma.intro", {
          locale: locale?.name ?? tc("email.locale.ripiego.noi"),
        }),
        "",
        tc("email.conferma.quando", { quando }),
        tc("email.conferma.persone", { n: prenotazione.party_size }),
        tc("email.conferma.tavolo", { tavoli: tavoliTesto }),
        prenotazione.notes ? tc("email.conferma.richieste", { note: prenotazione.notes }) : null,
        "",
        locale?.public_phone
          ? tc("email.conferma.cambiamenti.telefono", { telefono: locale.public_phone })
          : tc("email.conferma.cambiamenti"),
        // Il link c'è solo sulle prenotazioni nate dopo che la disdetta
        // esiste: alle vecchie non si può mandare un token che non hanno.
        ...(prenotazione.cancel_token
          ? [
              "",
              tc("email.conferma.disdetta.riga1"),
              tc("email.conferma.disdetta.riga2"),
              linkDisdetta(
                process.env.GUEST_APP_URL ?? "https://ristoranti-guest.vercel.app",
                locale?.slug ?? "",
                prenotazione.cancel_token
              ),
            ]
          : []),
      ]
        .filter((r) => r !== null)
        .join("\n"),
    });

    await segnaAvviso(sql, reservationId, esito);
    if (!esito.inviata) {
      avviso = prenotazione.customer_phone
        ? t("avviso.confermata.email_ko.telefono", {
            errore: String(esito.errore),
            telefono: prenotazione.customer_phone,
          })
        : t("avviso.confermata.email_ko", { errore: String(esito.errore) });
    }
  } else {
    avviso = prenotazione.customer_phone
      ? t("avviso.confermata.senza_email.telefono", { telefono: prenotazione.customer_phone })
      : t("avviso.confermata.senza_email");
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
  const t = tPrenotazioni(await linguaUtente());
  const { sql, prenotazione, locale } = await caricaContesto(venue.venueId, reservationId);

  if (!prenotazione) return { error: t("errore.non_trovata") };

  // Il motivo lo scrive il ristoratore e finisce tale e quale nell'email: il
  // ripiego va nella lingua del cliente, non nella sua.
  const tMotivo = tPrenotazioni(linguaCliente(prenotazione));
  const testoMotivo =
    motivo.trim().slice(0, 300) || tMotivo("email.rifiuto.motivo_predefinito");

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

    // Come sopra: chi legge è il cliente.
    const tc = tMotivo;
    const esito = await inviaEmail({
      a: prenotazione.customer_email,
      rispondiA: locale?.reservation_email ?? locale?.public_email ?? undefined,
      mittenteLocale: mittenteDi(locale),
      oggetto: tc("email.rifiuto.oggetto", {
        locale: locale?.name ?? tc("email.locale.ripiego"),
      }),
      testo: [
        tc("email.saluto", { nome: prenotazione.customer_name }),
        "",
        tc("email.rifiuto.intro", {
          quando: orarioLungo(prenotazione.reserved_at, fuso, tc.lingua),
          n: prenotazione.party_size,
        }),
        "",
        testoMotivo,
        "",
        alternative.length > 0
          ? [
              tc("email.rifiuto.alternative"),
              ...alternative.map((d) =>
                tc("email.rifiuto.alternativa", { quando: orarioLungo(d, fuso, tc.lingua) })
              ),
            ].join("\n")
          : tc("email.rifiuto.nessuna_alternativa"),
        "",
        tc("email.rifiuto.prenota", { url: urlPrenota }),
        locale?.public_phone
          ? tc("email.rifiuto.telefono", { telefono: locale.public_phone })
          : null,
        "",
        tc("email.rifiuto.saluto"),
      ]
        .filter((r) => r !== null)
        .join("\n"),
    });

    await segnaAvviso(sql, reservationId, esito);
    if (!esito.inviata) {
      avviso = prenotazione.customer_phone
        ? t("avviso.rifiutata.email_ko.telefono", {
            errore: String(esito.errore),
            telefono: prenotazione.customer_phone,
          })
        : t("avviso.rifiutata.email_ko", { errore: String(esito.errore) });
    }
  } else {
    avviso = prenotazione.customer_phone
      ? t("avviso.rifiutata.senza_email.telefono", { telefono: prenotazione.customer_phone })
      : t("avviso.rifiutata.senza_email");
  }

  revalidatePath("/dashboard/reservations");
  return { ok: true, avviso };
}

/** Inserimento manuale dallo staff: nasce già confermata, l'ha presa una persona. */
export async function addReservation(formData: FormData) {
  const { venue } = await requireVenue();
  const t = tPrenotazioni(await linguaUtente());
  const customerName = String(formData.get("customerName") ?? "").trim();
  const partySize = Number.parseInt(String(formData.get("partySize") ?? "0"), 10);
  const reservedAt = String(formData.get("reservedAt") ?? "");
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 300) || null;

  if (!customerName || !Number.isFinite(partySize) || partySize < 1 || !reservedAt) return;

  const sql = db();
  const [locale] = await sql<{ timezone: string | null }[]>`
    select timezone from venues where id = ${venue.venueId}`;

  // Il campo del modulo manda l'ora senza fuso: va letta come ora del
  // locale, o la prenotazione presa al telefono finisce spostata.
  const quando = interpretaOrario(reservedAt, locale?.timezone ?? "Europe/Rome");
  if (!quando) return;

  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${venue.venueId}))`;
    const [prenotazione] = await tx<{ id: string }[]>`
      -- Anche le prenotazioni prese al telefono hanno il loro link di
      -- disdetta: senza, chi ha lasciato l'email non può disdire da solo e
      -- il tavolo resta bloccato fino a quando qualcuno richiama.
      insert into reservations (venue_id, customer_name, customer_phone, customer_email,
                                party_size, reserved_at, notes, status, confirmed_at,
                                cancel_token)
      values (${venue.venueId}, ${customerName}, ${phone}, ${email}, ${partySize},
              ${quando}, ${notes}, 'confirmed', now(), ${nuovoTokenDisdetta()})
      returning id`;
    const tavoli = await assegnaTavoliPrenotazione(
      tx,
      prenotazione.id,
      venue.venueId,
      quando,
      partySize
    );
    if (tavoli.length === 0) throw new Error(t("errore.nessun_tavolo"));
  });
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
