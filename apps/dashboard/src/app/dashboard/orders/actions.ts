"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";
import type { OrderItemStatus } from "@repo/shared";

export async function setOrderItemStatus(orderItemId: string, status: OrderItemStatus) {
  const { venue } = await requireVenue();
  const sql = db();

  // order_items non ha venue_id diretto — verifica ownership via join,
  // altrimenti chiunque autenticato su un altro venue potrebbe modificare
  // comande non sue passando un id a caso.
  await sql`
    update order_items set status = ${status}
    where id = ${orderItemId}
      and order_id in (select id from orders where venue_id = ${venue.venueId})`;

  revalidatePath("/dashboard/orders");
}

/**
 * Avanza in blocco tutte le righe di un tavolo che si trovano in un dato
 * stato.
 *
 * In cucina i piatti di un tavolo escono insieme: toccarli uno per uno
 * significa sei tocchi con le mani occupate, e nel frattempo il piatto si
 * fredda. Il filtro sullo stato di partenza evita di trascinare avanti una
 * riga che qualcun altro ha già spostato mentre si guardava lo schermo.
 */
export async function advanceTableItems(
  tableCode: string,
  from: OrderItemStatus,
  to: OrderItemStatus
): Promise<{ aggiornate: number }> {
  const { venue } = await requireVenue();
  const sql = db();

  const righe = await sql<{ id: string }[]>`
    update order_items oi set status = ${to}
      from orders o, table_sessions ts, tables t
     where oi.order_id = o.id
       and o.table_session_id = ts.id
       and ts.table_id = t.id
       and o.venue_id = ${venue.venueId}
       and t.code = ${tableCode}
       and oi.status = ${from}
    returning oi.id`;

  revalidatePath("/dashboard/orders");
  return { aggiornate: righe.length };
}
