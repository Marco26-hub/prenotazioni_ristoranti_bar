import "server-only";
import { createHash } from "node:crypto";
import { db } from "@repo/shared/db";

/**
 * Riconosce l'agente che gira sul computer della cassa.
 *
 * Il segreto lo genera il locale e lo vede una volta sola: qui resta solo
 * l'impronta. In chiaro, chiunque possa leggere il database potrebbe fingersi
 * la cassa di un locale — e emettere documenti fiscali per conto suo.
 *
 * Si cerca per impronta con un indice unico: per costruire l'impronta
 * bisogna già conoscere il segreto, quindi non c'è niente da indovinare
 * misurando i tempi.
 */
export function improntaAgente(segreto: string): string {
  return createHash("sha256").update(segreto).digest("hex");
}

export async function localeDalToken(
  request: Request
): Promise<{ venueId: string; matricola: string | null } | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token.length < 20 || token.length > 200) return null;

  const impronta = improntaAgente(token);
  const sql = db();

  /*
   * Si cerca l'impronta, non si scorrono i locali.
   *
   * Prima venivano caricati tutti i locali con un agente configurato e
   * confrontati uno per uno: con mille locali che interrogano la coda ogni
   * cinque secondi sono dodicimila scansioni complete al minuto. Funziona
   * benissimo con tre clienti e mette in ginocchio il database con mille —
   * senza dare nessun errore, solo diventando lento.
   *
   * L'impronta è uno SHA-256 e quindi deterministica: l'indice unico la
   * trova in un colpo. Il confronto a tempo costante qui non serve più — non
   * si sta confrontando un segreto con quello che ha scritto qualcuno, si
   * sta cercando un valore che per costruirlo bisogna già conoscerlo.
   *
   * L'ultimo contatto si aggiorna nella stessa scrittura: serve a dire al
   * ristoratore che la cassa è viva, perché un agente spento è
   * indistinguibile da una coda vuota finché non ci si accorge che non esce
   * più niente.
   */
  const [locale] = await sql<{ id: string; rt_matricola: string | null }[]>`
    update venues set rt_agente_visto_at = now()
     where rt_agente_hash = ${impronta}
       and rt_attivo = true and rt_modalita = 'agente'
    returning id, rt_matricola`;

  return locale ? { venueId: locale.id, matricola: locale.rt_matricola } : null;
}
