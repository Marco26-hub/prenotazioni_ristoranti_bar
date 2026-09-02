import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";
import { hasModulo } from "@repo/shared";
import { inviaEmail } from "@repo/shared/email";
import { decryptSecret } from "@repo/shared/crypto";
import {
  disponibilita,
  slotAlternativi,
  formattaOrario,
  interpretaOrario,
} from "@repo/shared/prenotazioni";

interface Body {
  slug: string;
  name: string;
  phone?: string;
  email?: string;
  partySize: number;
  reservedAt: string;
  notes?: string;
}

/** Oltre questo non è più una prenotazione ma un evento, da concordare. */
const MAX_PARTY = 20;
/** Un anno avanti: oltre è quasi sempre un errore di digitazione sull'anno. */
const MAX_DAYS_AHEAD = 365;

interface VenueRow {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  subscription_period_end: Date | null;
  reservation_email: string | null;
  public_email: string | null;
  public_phone: string | null;
  reservation_auto_confirm: boolean;
  reservation_capacity: number | null;
  timezone: string | null;
  modules: string[] | null;
  resend_api_key: string | null;
  resend_from: string | null;
}

/**
 * Prenotazione dal sito del locale.
 *
 * Endpoint pubblico e senza autenticazione: chiunque abbia il link può
 * scrivere qui, quindi ogni valore va validato e il ritmo va limitato.
 */
export async function POST(request: Request) {
  const { allowed } = await checkRateLimit(clientKey(request, "reservation"), 5, 3600);
  if (!allowed) {
    return NextResponse.json(
      { error: "Troppe prenotazioni dallo stesso dispositivo. Riprova più tardi o chiamaci." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.slug || !body.name?.trim() || !body.reservedAt) {
    return NextResponse.json({ error: "Compila nome, data e ora" }, { status: 400 });
  }

  const partySize = Number(body.partySize);
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > MAX_PARTY) {
    return NextResponse.json(
      { error: `Indica da 1 a ${MAX_PARTY} persone. Per gruppi più grandi chiamaci.` },
      { status: 400 }
    );
  }

  const phone = body.phone?.trim() || null;
  const email = body.email?.trim() || null;

  // Senza un recapito il locale non può avvisare in caso di problemi, e non
  // ha modo di distinguere una prenotazione vera da uno scherzo.
  if (!phone && !email) {
    return NextResponse.json(
      { error: "Lascia un telefono o un'email: servono per confermarti il tavolo" },
      { status: 400 }
    );
  }

  const sql = db();
  const [venue] = await sql<VenueRow[]>`
    select id, name, slug, subscription_status, subscription_period_end,
           reservation_email, public_email, public_phone,
           reservation_auto_confirm, reservation_capacity, timezone, modules,
           resend_api_key, resend_from
      from venues where slug = ${body.slug}`;

  if (!venue) {
    return NextResponse.json({ error: "Locale non trovato" }, { status: 404 });
  }
  if (
    !hasModulo(
      "prenotazioni",
      venue.subscription_status,
      venue.subscription_period_end,
      venue.modules
    )
  ) {
    return NextResponse.json(
      { error: "Prenotazione online non attiva per questo locale — chiama il ristorante" },
      { status: 402 }
    );
  }

  const fuso = venue.timezone ?? "Europe/Rome";

  // L'orario arriva senza fuso dal campo datetime-local: va letto come ora
  // del locale, non del server. Interpretarlo come UTC sposterebbe la
  // prenotazione di due ore in estate.
  const when = interpretaOrario(body.reservedAt, fuso);
  if (!when) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 });
  }
  if (when.getTime() < Date.now()) {
    return NextResponse.json({ error: "La data è già passata" }, { status: 400 });
  }
  if (when.getTime() > Date.now() + MAX_DAYS_AHEAD * 86400_000) {
    return NextResponse.json({ error: "Data troppo lontana — controlla l'anno" }, { status: 400 });
  }


  // La chiave è cifrata a riposo: si decifra qui, al momento dell'uso, e se
  // è illeggibile si prosegue col mittente della piattaforma invece di
  // perdere la prenotazione.
  const mittenteLocale = venue.resend_api_key
    ? (() => {
        try {
          return { apiKey: decryptSecret(venue.resend_api_key), from: venue.resend_from };
        } catch {
          console.error(`[prenotazioni] chiave email illeggibile per ${venue.slug}`);
          return undefined;
        }
      })()
    : undefined;
  const notes = body.notes?.trim().slice(0, 300) || null;
  const nome = body.name.trim();

  // --- Logica di disponibilità -------------------------------------------
  const disp = await disponibilita(sql, venue.id, when, partySize);

  if (!disp.bastano) {
    const alternative = await slotAlternativi(sql, venue.id, when, partySize);

    // Rifiuto immediato, senza scrivere nulla: far attendere una risposta
    // per un orario che è già pieno fa perdere il cliente due volte.
    return NextResponse.json(
      {
        error: `Per ${formattaOrario(when, fuso)} non abbiamo più posto per ${partySize} persone.`,
        alternative: alternative.map((d) => ({
          iso: d.toISOString(),
          etichetta: formattaOrario(d, fuso),
        })),
      },
      { status: 409 }
    );
  }

  // La conferma automatica vale solo se il locale l'ha scelta *e* ha
  // dichiarato una capienza: senza capienza il sistema non sa cosa sta
  // confermando, e confermerebbe alla cieca.
  const automatica = venue.reservation_auto_confirm && disp.capienza !== null;
  const stato = automatica ? "confirmed" : "pending";

  const [prenotazione] = await sql<{ id: string }[]>`
    insert into reservations
      (venue_id, customer_name, customer_phone, customer_email, party_size,
       reserved_at, notes, status, confirmed_at)
    values (${venue.id}, ${nome}, ${phone}, ${email}, ${partySize},
            ${when}, ${notes}, ${stato}, ${automatica ? sql`now()` : null})
    returning id`;

  // --- Avvisi ------------------------------------------------------------
  const quandoTesto = formattaOrario(when, fuso);
  const destinatarioLocale = venue.reservation_email ?? venue.public_email;

  if (destinatarioLocale) {
    const esito = await inviaEmail({
      a: destinatarioLocale,
      rispondiA: email ?? undefined,
      mittenteLocale,
      oggetto: automatica
        ? `Nuova prenotazione confermata — ${nome}, ${partySize}p, ${quandoTesto}`
        : `Da confermare — ${nome}, ${partySize}p, ${quandoTesto}`,
      testo: [
        automatica
          ? "Prenotazione accettata automaticamente: c'era posto."
          : "Nuova richiesta di prenotazione, in attesa di una tua risposta.",
        "",
        `Nome: ${nome}`,
        `Persone: ${partySize}`,
        `Quando: ${quandoTesto}`,
        phone ? `Telefono: ${phone}` : null,
        email ? `Email: ${email}` : null,
        notes ? `Richieste: ${notes}` : null,
        "",
        disp.capienza !== null
          ? `Occupazione in quella fascia: ${disp.occupati + partySize} su ${disp.capienza} coperti.`
          : "Capienza non impostata: il controllo automatico non è attivo.",
        "",
        automatica
          ? "Puoi comunque annullarla dal gestionale."
          : "Confermala o rifiutala dal gestionale, alla voce Prenotazioni.",
      ]
        .filter((r) => r !== null)
        .join("\n"),
    });

    await sql`
      update reservations set
        venue_notified_at = ${esito.inviata ? sql`now()` : null},
        venue_notify_error = ${esito.errore ?? null}
      where id = ${prenotazione.id}`;
  } else {
    await sql`
      update reservations
         set venue_notify_error = 'Nessun indirizzo per le prenotazioni impostato'
       where id = ${prenotazione.id}`;
  }

  if (automatica && email) {
    const esito = await inviaEmail({
      a: email,
      rispondiA: venue.reservation_email ?? venue.public_email ?? undefined,
      mittenteLocale,
      oggetto: `Prenotazione confermata — ${venue.name}`,
      testo: [
        `Ciao ${nome},`,
        "",
        `la tua prenotazione da ${venue.name} è confermata.`,
        "",
        `Quando: ${quandoTesto}`,
        `Persone: ${partySize}`,
        notes ? `Richieste: ${notes}` : null,
        "",
        venue.public_phone
          ? `Se qualcosa cambia, chiamaci al ${venue.public_phone}.`
          : "Se qualcosa cambia, faccelo sapere rispondendo a questa email.",
      ]
        .filter((r) => r !== null)
        .join("\n"),
    });

    await sql`
      update reservations set
        guest_notified_at = ${esito.inviata ? sql`now()` : null},
        guest_notify_error = ${esito.errore ?? null}
      where id = ${prenotazione.id}`;
  }

  return NextResponse.json({
    ok: true,
    venueName: venue.name,
    stato,
    // Il cliente deve sapere se ha un tavolo o una richiesta in attesa: è
    // la differenza fra presentarsi tranquillo e presentarsi a vuoto.
    messaggio: automatica
      ? `Tavolo confermato per ${quandoTesto}.`
      : `Richiesta inviata per ${quandoTesto}. ${venue.name} ti risponde a breve.`,
  });
}
