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
