import "server-only";
import { db } from "@repo/shared/db";
import { contoSessione } from "@repo/shared/conto";

export interface UnpaidItem {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface Formula {
  /** Il tavolo è a formula: i piatti inclusi non si pagano a piatto. */
  attiva: boolean;
  /** Prezzo a persona della fascia in corso. */
  prezzoUnitarioCents: number;
  adulti: number;
  bambini: number;
  /** Tariffa bambino applicata: null = pagano come gli adulti. */
  prezzoBambinoCents: number | null;
  /** Supplemento per l'avanzato, deciso dallo staff alla chiusura. */
  supplementoCents: number;
  /** Coperti × prezzo + bambini + supplemento. */
  totaleCents: number;
  fascia: "pranzo" | "cena";
}

export interface Supplementi {
  copertoUnitarioCents: number;
  coperti: number;
  copertoTotaleCents: number;
  servizioPercent: number;
  servizioCents: number;
  totaleCents: number;
  etichettaCoperto: string;
}

/*
 * Tutto passa da contoSessione.
 *
 * Queste funzioni erano quattro copie della stessa aritmetica, e finché il
 * conto era "somma dei piatti" davano lo stesso numero per caso. Con la
 * formula a prezzo fisso hanno smesso, in modi che nessuno vedeva: il
 * servizio calcolato su piatti che nessuno paga, lo split alla romana che
 * addebitava a listino voci dichiarate comprese. Restano come firme perché
 * mezza applicazione le chiama, ma il calcolo sta in un posto solo.
 */

export async function formulaCents(sessionId: string): Promise<Formula> {
  const c = await contoSessione(db(), sessionId);
  return {
    attiva: c.aFormula,
    prezzoUnitarioCents: c.formulaUnitarioCents,
    adulti: c.adulti,
    bambini: c.bambini,
    prezzoBambinoCents: c.formulaBambinoCents,
    supplementoCents: c.supplementoCents,
    totaleCents: c.formulaTotaleCents,
    fascia: c.fascia,
  };
}

export async function supplementiCents(sessionId: string): Promise<Supplementi> {
  const c = await contoSessione(db(), sessionId);
  return {
    copertoUnitarioCents: c.copertoUnitarioCents,
    coperti: c.coperti,
    copertoTotaleCents: c.copertoTotaleCents,
    servizioPercent: c.servizioPercent,
    servizioCents: c.servizioCents,
    totaleCents: c.copertoTotaleCents + c.servizioCents,
    etichettaCoperto: c.etichettaCoperto,
  };
}

export async function outstandingBalanceCents(sessionId: string): Promise<number> {
  return (await contoSessione(db(), sessionId)).residuoCents;
}

/**
 * Piatti ancora da pagare, per il conto alla romana.
 *
 * A formula contiene solo le voci fuori formula: dividere per piatto un
 * pasto venduto a persona faceva pagare a listino proprio le voci che il
 * menu dichiarava comprese.
 */
export async function unpaidItems(sessionId: string): Promise<UnpaidItem[]> {
  const sql = db();
  const conto = await contoSessione(sql, sessionId);

  const impegnati = await sql<{ order_item_id: string }[]>`
    select poi.order_item_id
      from payment_order_items poi
      join payments p on p.id = poi.payment_id
     where p.table_session_id = ${sessionId}
       and p.status in ('succeeded', 'pending')`;

  const presi = new Set(impegnati.map((r) => r.order_item_id));

  return conto.righe
    .filter((r) => !presi.has(r.id))
    .map((r) => ({
      id: r.id,
      name: r.nome,
      quantity: r.quantita,
      unitPriceCents: r.prezzoUnitarioCents,
      totalCents: r.totaleCents,
    }));
}
