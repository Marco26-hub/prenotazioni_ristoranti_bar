import "server-only";
import { db } from "@repo/shared/db";

/**
 * Saldo residuo di una sessione tavolo: totale ordinato meno pagamenti già
 * riusciti. MVP: solo pagamento a saldo pieno (split_type 'full') — lo
 * split per persona/piatto arriva dopo, sfruttando payment_order_items.
 */
export async function outstandingBalanceCents(sessionId: string): Promise<number> {
  const sql = db();

  const [ordered] = await sql<{ total: string | null }[]>`
    select sum(oi.quantity * oi.unit_price_cents) as total
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.table_session_id = ${sessionId}
      and o.status != 'cancelled'
      and oi.status != 'cancelled'`;

  const [paid] = await sql<{ total: string | null }[]>`
    select sum(amount_cents) as total
    from payments
    where table_session_id = ${sessionId} and status = 'succeeded'`;

  const orderedTotal = Number(ordered?.total ?? 0);
  const paidTotal = Number(paid?.total ?? 0);

  return Math.max(orderedTotal - paidTotal, 0);
}
