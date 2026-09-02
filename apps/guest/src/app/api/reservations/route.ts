import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";
import { isEntitled } from "@repo/shared";

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

  const when = new Date(body.reservedAt);
  if (Number.isNaN(when.getTime())) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 });
  }
  if (when.getTime() < Date.now()) {
    return NextResponse.json({ error: "La data è già passata" }, { status: 400 });
  }
  if (when.getTime() > Date.now() + MAX_DAYS_AHEAD * 86400_000) {
    return NextResponse.json({ error: "Data troppo lontana — controlla l'anno" }, { status: 400 });
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
  const [venue] = await sql<
    { id: string; name: string; subscription_status: string; subscription_period_end: Date | null }[]
  >`select id, name, subscription_status, subscription_period_end
      from venues where slug = ${body.slug}`;

  if (!venue) {
    return NextResponse.json({ error: "Locale non trovato" }, { status: 404 });
  }
  if (!isEntitled(venue.subscription_status, venue.subscription_period_end)) {
    return NextResponse.json(
      { error: "Prenotazione online non attiva per questo locale — chiama il ristorante" },
      { status: 402 }
    );
  }

  const notes = body.notes?.trim().slice(0, 300) || null;

  // Le note del cliente finiscono in coda al nome perché la tabella non ha
  // un campo dedicato: meglio che il locale le veda, invece di perderle.
  const name = notes ? `${body.name.trim()} — ${notes}` : body.name.trim();

  await sql`
    insert into reservations
      (venue_id, customer_name, customer_phone, customer_email, party_size, reserved_at)
    values (${venue.id}, ${name}, ${phone}, ${email}, ${partySize}, ${when})`;

  return NextResponse.json({ ok: true, venueName: venue.name });
}
