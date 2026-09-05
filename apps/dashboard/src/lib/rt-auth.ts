import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "@repo/shared/db";

/**
 * Riconosce l'agente che gira sul computer della cassa.
 *
 * Il segreto lo genera il locale e lo vede una volta sola: qui resta solo
 * l'impronta. In chiaro, chiunque possa leggere il database potrebbe fingersi
 * la cassa di un locale — e emettere documenti fiscali per conto suo.
 *
 * Il confronto è a tempo costante: su un segreto che vale l'emissione di
 * scontrini, la differenza di pochi microsecondi fra un confronto fallito al
 * primo carattere e uno fallito all'ultimo è un modo per indovinarlo.
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

  const righe = await sql<
    { id: string; rt_agente_hash: string; rt_matricola: string | null }[]
  >`select id, rt_agente_hash, rt_matricola
      from venues
     where rt_attivo = true and rt_modalita = 'agente'
       and rt_agente_hash is not null`;

  for (const r of righe) {
    const a = Buffer.from(r.rt_agente_hash);
    const b = Buffer.from(impronta);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      // Serve a mostrare al ristoratore che la cassa è viva: un agente
      // spento è indistinguibile da una coda vuota, finché non ci si
      // accorge che non esce più niente.
      await sql`
        update venues set rt_agente_visto_at = now() where id = ${r.id}`;
      return { venueId: r.id, matricola: r.rt_matricola };
    }
  }

  return null;
}
