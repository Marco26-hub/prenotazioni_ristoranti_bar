import "server-only";
import { db } from "@repo/shared/db";
import { hasModulo } from "@repo/shared";

export interface ResolvedVenue {
  id: string;
  name: string;
  slug: string;
  currency: string;
  logo_url: string | null;
  brand_color: string | null;
  public_phone: string | null;
  public_email: string | null;
  vat_number: string | null;
  address: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_province: string | null;
  subscription_status: string;
  subscription_period_end: Date | null;
  modules: string[] | null;
  /** Ore dopo cui una sessione lasciata aperta scade. 0 = mai. */
  sessione_max_ore: number;
  ordine_intervallo_min: number;
  pickup_numbering_enabled: boolean;
  pickup_metodi: string[] | null;
}

export interface ResolvedTable {
  venue: ResolvedVenue;
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

  const [venue] = await sql<ResolvedVenue[]>`
    select id, name, slug, currency, logo_url, brand_color,
           public_phone, public_email, vat_number,
           address, address_zip, address_city, address_province,
           subscription_status, subscription_period_end, modules,
           sessione_max_ore, ordine_intervallo_min,
           pickup_numbering_enabled, pickup_metodi
    from venues where slug = ${slug}`;
  if (
    !venue ||
    !hasModulo("ordini", venue.subscription_status, venue.subscription_period_end, venue.modules)
  ) return null;

  const [table] = await sql<
    { id: string; code: string; seats: number; active: boolean }[]
  >`select id, code, seats, active from tables
    where venue_id = ${venue.id} and qr_token = ${qrToken}`;
  if (!table || !table.active) return null;

  /*
   * Una sessione dimenticata aperta non vale per sempre.
   *
   * L'unica chiusura automatica è il webhook a saldo zero: un conto pagato in
   * contanti, o un tavolo andato via senza pagare, restava aperto. Il giorno
   * dopo un altro cliente inquadrava lo stesso QR e si trovava davanti il
   * conto di sconosciuti — e pagandolo lo pagava davvero.
   *
   * Oltre la soglia la sessione viene chiusa e ne nasce una nuova. Non si
   * cancella niente: il conto vecchio resta a storico e in sala, così il
   * locale può ancora incassarlo se qualcuno era davvero uscito senza pagare.
   */
  const maxOre = venue.sessione_max_ore ?? 6;

  if (maxOre > 0) {
    await sql`
      update table_sessions
         set status = 'closed', closed_at = now()
       where table_id = ${table.id} and status = 'open'
         and opened_at < now() - make_interval(hours => ${maxOre})`;
  }

  const [existingSession] = await sql<{ id: string }[]>`
    select id from table_sessions
    where table_id = ${table.id} and status = 'open'
    order by opened_at desc
    limit 1`;

  let sessionId: string;

  if (existingSession) {
    sessionId = existingSession.id;
  } else {
    try {
      /*
       * Il tavolo nasce a formula se il locale l'ha deciso.
       *
       * Il cliente apre la sessione inquadrando il QR, prima che qualcuno
       * del personale la guardi: se partisse sempre alla carta, in un all
       * you can eat ogni tavolo andrebbe corretto a mano, e quello
       * dimenticato pagherebbe i piatti a prezzo di listino.
       */
      const [newSession] = await sql<{ id: string }[]>`
        insert into table_sessions (table_id, venue_id, status, formula)
        select ${table.id}, ${venue.id}, 'open',
               (v.formula_attiva and v.formula_predefinita)
          from venues v where v.id = ${venue.id}
        returning id`;
      if (!newSession) return null;
      sessionId = newSession.id;
    } catch (err) {
      // Due scansioni dello stesso QR quasi simultanee: l'indice unique su
      // (table_id) where status='open' fa perdere la seconda insert — non è
      // un errore, va solo letta la sessione che ha vinto la corsa.
      const isUniqueViolation = err instanceof Error && "code" in err && err.code === "23505";
      if (!isUniqueViolation) throw err;

      const [winner] = await sql<{ id: string }[]>`
        select id from table_sessions where table_id = ${table.id} and status = 'open'`;
      if (!winner) return null;
      sessionId = winner.id;
    }
  }

  return {
    venue,
    table: { id: table.id, code: table.code, seats: table.seats },
    sessionId,
  };
}
