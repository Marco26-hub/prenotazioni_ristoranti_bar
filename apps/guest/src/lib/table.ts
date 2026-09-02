import "server-only";
import { db } from "@repo/shared/db";

export interface ResolvedTable {
  venue: { id: string; name: string; slug: string; currency: string };
  table: { id: string; code: string; seats: number };
  sessionId: string;
}

/**
 * Risolve slug locale + qr_token in venue/tavolo, e riusa la table_session
 * "open" corrente o ne apre una nuova. Il qr_token stampato sul tavolo è
 * l'unica autorizzazione richiesta — non c'è login cliente.
 */
export async function resolveTableFromQr(
  slug: string,
  qrToken: string
): Promise<ResolvedTable | null> {
  const sql = db();

  const [venue] = await sql<
    { id: string; name: string; slug: string; currency: string }[]
  >`select id, name, slug, currency from venues where slug = ${slug}`;
  if (!venue) return null;

  const [table] = await sql<
    { id: string; code: string; seats: number; active: boolean }[]
  >`select id, code, seats, active from tables
    where venue_id = ${venue.id} and qr_token = ${qrToken}`;
  if (!table || !table.active) return null;

  const [existingSession] = await sql<{ id: string }[]>`
    select id from table_sessions
    where table_id = ${table.id} and status = 'open'
    order by opened_at desc
    limit 1`;

  let sessionId: string;

  if (existingSession) {
    sessionId = existingSession.id;
  } else {
    const [newSession] = await sql<{ id: string }[]>`
      insert into table_sessions (table_id, venue_id, status)
      values (${table.id}, ${venue.id}, 'open')
      returning id`;
    if (!newSession) return null;
    sessionId = newSession.id;
  }

  return {
    venue,
    table: { id: table.id, code: table.code, seats: table.seats },
    sessionId,
  };
}
