import "server-only";
import { db } from "@repo/shared/db";

export interface UnpaidItem {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

/**
 * Saldo residuo di una sessione tavolo: totale ordinato meno pagamenti già
 * riusciti. Vale sia per il pagamento a saldo pieno sia come somma di
 * quanto resta dopo pagamenti parziali (split).
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

/**
 * Piatti ancora da pagare: quelli non già impegnati da un pagamento riuscito
 * o in corso. Un pagamento fallito non blocca più le sue righe, così un
 * tentativo andato male non lascia piatti impagabili.
 */
export async function unpaidItems(sessionId: string): Promise<UnpaidItem[]> {
  const sql = db();

  const rows = await sql<
    { id: string; name: string; quantity: number; unit_price_cents: number }[]
  >`
    select oi.id, mi.name, oi.quantity, oi.unit_price_cents
    from order_items oi
    join orders o on o.id = oi.order_id
    join menu_items mi on mi.id = oi.menu_item_id
    where o.table_session_id = ${sessionId}
      and o.status != 'cancelled'
      and oi.status != 'cancelled'
      and not exists (
        select 1 from payment_order_items poi
        join payments p on p.id = poi.payment_id
        where poi.order_item_id = oi.id
          and p.status in ('pending', 'succeeded')
      )
    order by mi.name`;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    quantity: r.quantity,
    unitPriceCents: r.unit_price_cents,
    totalCents: r.quantity * r.unit_price_cents,
  }));
}
