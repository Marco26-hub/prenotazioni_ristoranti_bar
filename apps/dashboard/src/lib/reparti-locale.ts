import "server-only";
import { db } from "@repo/shared/db";
import { REPARTI, type Reparto } from "@repo/shared/reparti";

/**
 * Le postazioni di un locale.
 *
 * Chi non ne ha definite usa le sei di partenza: nessun locale già avviato
 * deve accorgersi che questa tabella esiste. Chi ne definisce usa le sue —
 * due cucine, il forno separato dalla friggitoria, il "pass" da cui la sala
 * ritira. Ogni locale è fatto a modo suo, e un elenco scritto nel programma
 * costringe tutti in sei parole che non sono le loro.
 */

export interface RepartoLocale {
  chiave: string;
  etichetta: string;
}

const PREDEFINITI: RepartoLocale[] = REPARTI.map((r) => ({
  chiave: r.chiave,
  etichetta: r.etichetta,
}));

export async function repartiDelLocale(venueId: string): Promise<RepartoLocale[]> {
  const sql = db();
  const righe = await sql<{ chiave: string; etichetta: string }[]>`
    select chiave, etichetta from venue_reparti
     where venue_id = ${venueId} order by sort_order, etichetta`;

  return righe.length > 0 ? righe : PREDEFINITI;
}

/**
 * Crea le postazioni che un formato usa, se il locale non ne ha già di sue.
 *
 * Il modello sa dove si prepara ogni cosa: è l'unica occasione in cui il
 * sistema lo sa senza chiedere. Ma quello che crea è un punto di partenza —
 * il locale poi rinomina, aggiunge e toglie.
 */
export async function seminaReparti(
  sql: ReturnType<typeof db>,
  venueId: string,
  chiavi: string[]
): Promise<void> {
  const usate = [...new Set(chiavi)];
  if (usate.length === 0) return;

  for (const [i, chiave] of usate.entries()) {
    const etichetta =
      PREDEFINITI.find((r) => r.chiave === chiave)?.etichetta ?? chiave;
    // Non sovrascrive: chi ha già rinominato "Cucina" in "Cucina 1" non deve
    // ritrovarsela rinominata indietro riapplicando un formato.
    await sql`
      insert into venue_reparti (venue_id, chiave, etichetta, sort_order)
      values (${venueId}, ${chiave}, ${etichetta}, ${i})
      on conflict (venue_id, chiave) do nothing`;
  }
}

/** Il nome da mostrare, secondo l'elenco di questo locale. */
export function etichettaDi(reparti: RepartoLocale[], chiave: string | null): string {
  return (
    reparti.find((r) => r.chiave === (chiave ?? "cucina"))?.etichetta ??
    chiave ??
    "Cucina"
  );
}

export type { Reparto };
