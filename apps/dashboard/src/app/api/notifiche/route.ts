import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@repo/shared/db";

/**
 * Cosa richiede attenzione adesso.
 *
 * Interrogato dal gestionale ogni mezzo minuto. Restituisce numeri e
 * l'istante dell'ultima novità, non le righe: la lista completa vive già
 * nelle pagine, qui serve solo sapere se è successo qualcosa.
 */
export async function GET() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const sql = db();

  const [prenotazioni] = await sql<{ n: number; ultima: Date | null }[]>`
    select count(*)::int as n, max(created_at) as ultima
      from reservations
     where venue_id = ${venue.venueId} and status = 'pending'`;

  const [passe] = await sql<{ n: number }[]>`
    select count(*)::int as n
      from order_items oi
      join orders o on o.id = oi.order_id
     where o.venue_id = ${venue.venueId} and oi.status = 'ready'`;

  const chiamate = await sql<
    { tavolo: string; motivo: string; documento: string | null; quando: Date }[]
  >`
    select t.code as tavolo, c.motivo, c.documento, c.created_at as quando
      from table_calls c
      join table_sessions ts on ts.id = c.table_session_id
      join tables t on t.id = ts.table_id
     -- Solo tavoli ancora aperti: una chiamata rimasta su una sessione
     -- chiusa è un tavolo che ha già pagato ed è andato via, e continuava
     -- a suonare in sala per sempre.
     where c.venue_id = ${venue.venueId}
       and c.handled_at is null
       and ts.status = 'open'
     order by c.created_at`;

  return NextResponse.json({
    prenotazioniDaConfermare: prenotazioni?.n ?? 0,
    ultimaPrenotazione: prenotazioni?.ultima ?? null,
    piattiAlPasse: passe?.n ?? 0,
    chiamate: chiamate.map((c) => ({
      tavolo: c.tavolo,
      motivo: c.motivo,
      documento: c.documento,
      quando: c.quando.toISOString(),
    })),
  });
}
