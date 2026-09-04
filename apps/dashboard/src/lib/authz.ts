import "server-only";
import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { hasModulo, type StaffRole, type Modulo } from "@repo/shared";
import type { VenueMembership } from "./staff";

/**
 * Ogni Server Action è un endpoint POST raggiungibile da chiunque conosca
 * l'action id, non solo da chi vede il bottone in UI — va sempre riverificata
 * l'appartenenza al venue qui dentro, non solo a livello di pagina.
 */
export async function requireVenue(): Promise<{ userId: string; venue: VenueMembership }> {
  const session = await auth();
  const venue = session?.venues[0];
  if (!session?.user.id || !venue) {
    throw new Error("Non autorizzato");
  }
  return { userId: session.user.id, venue };
}

/**
 * Per azioni sensibili (dati fiscali, pagamenti, cancellazioni) non basta
 * "è staff di questo venue" — cameriere/cucina non devono poter toccare
 * queste operazioni solo perché conoscono l'action id.
 */
export async function requireRole(
  allowedRoles: StaffRole[],
  /**
   * Modulo che questa operazione richiede, se ne richiede uno.
   *
   * Il ruolo dice chi sei, il modulo dice cosa il locale ha comprato: sono
   * due domande diverse e servono entrambe. Sta qui e non in una chiamata a
   * parte per non fare due letture del database a ogni azione.
   */
  modulo?: Modulo
): Promise<{ userId: string; venue: VenueMembership }> {
  const result = await requireVenue();
  if (!allowedRoles.includes(result.venue.role)) {
    throw new Error("Permessi insufficienti per questa operazione");
  }
  if (modulo && !(await moduloAttivo(result.venue.venueId, modulo))) {
    throw new Error(`Modulo "${modulo}" non attivo per questo locale`);
  }
  return result;
}

/**
 * Oltre all'appartenenza, il modulo pagato.
 *
 * NOTA su dove si applica. Il modulo si chiede sulle azioni che *usano* il
 * gestionale — menu, tavoli, QR, importazioni — e non su quelle che
 * *chiudono* lavoro già cominciato: segnare un piatto servito o incassare un
 * conto. Un abbonamento che scade alle nove di sera non deve lasciare i
 * tavoli aperti per sempre e i clienti senza conto. Il lato cliente è
 * comunque sbarrato a monte: senza modulo dal tavolo non si ordina più.
 *
 * Il filtro delle voci di menu nel layout è cosmetica: chi digita
 * `/dashboard/menu` la pagina la ottiene lo stesso, e ogni Server Action è
 * comunque un POST pubblico per chi ne conosce l'id. Finché il controllo
 * stava solo nella navigazione, un locale con abbonamento scaduto — o che
 * paga solo le prenotazioni — usava per intero il gestionale che non ha
 * comprato: menu, tavoli, QR, comande, analisi, fatture.
 *
 * Lo stato si rilegge dal database a ogni chiamata e non dal token: un
 * abbonamento scaduto deve valere subito, non alla prossima sessione, e un
 * token dura dodici ore.
 */
export async function requireModulo(
  modulo: Modulo
): Promise<{ userId: string; venue: VenueMembership }> {
  const result = await requireVenue();
  const sql = db();

  const [row] = await sql<
    {
      subscription_status: string;
      subscription_period_end: Date | null;
      modules: string[] | null;
    }[]
  >`select subscription_status, subscription_period_end, modules
      from venues where id = ${result.venue.venueId}`;

  if (
    !hasModulo(
      modulo,
      row?.subscription_status,
      row?.subscription_period_end ?? null,
      row?.modules ?? null
    )
  ) {
    throw new Error(
      modulo === "ordini"
        ? "Il modulo Ordini e pagamenti non è attivo su questo abbonamento."
        : "Il modulo Prenotazioni non è attivo su questo abbonamento."
    );
  }

  return result;
}

/** Come requireModulo, ma restituisce un booleano invece di lanciare: serve
 *  alle pagine, che devono poter mostrare una spiegazione al posto di un
 *  errore. */
export async function moduloAttivo(
  venueId: string,
  modulo: Modulo
): Promise<boolean> {
  const sql = db();
  const [r] = await sql<
    {
      subscription_status: string;
      subscription_period_end: Date | null;
      modules: string[] | null;
    }[]
  >`select subscription_status, subscription_period_end, modules
      from venues where id = ${venueId}`;

  return hasModulo(
    modulo,
    r?.subscription_status,
    r?.subscription_period_end ?? null,
    r?.modules ?? null
  );
}

/**
 * Il super amministratore della piattaforma.
 *
 * Riletto dal database a ogni chiamata e non messo nel token: un token dura
 * dodici ore, e revocare questo ruolo deve avere effetto subito, non domani.
 * È l'unico ruolo che vede i dati di tutti i locali.
 */
export async function requireSuperAdmin(): Promise<{
  userId: string;
  email: string;
  deveCambiarePassword: boolean;
}> {
  const session = await auth();
  if (!session?.user.id) throw new Error("Non autorizzato");

  const sql = db();
  const [u] = await sql<
    { email: string; is_super_admin: boolean; must_change_password: boolean }[]
  >`select email, is_super_admin, must_change_password
      from users where id = ${session.user.id}`;

  if (!u?.is_super_admin) throw new Error("Non autorizzato");

  return {
    userId: session.user.id,
    email: u.email,
    deveCambiarePassword: u.must_change_password,
  };
}
