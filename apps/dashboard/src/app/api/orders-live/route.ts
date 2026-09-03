import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@repo/shared/db";

export async function GET() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue || !session?.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const userId = session.user.id;

  const sql = db();
  const rows = await sql<
    {
      id: string;
      table_code: string;
      item_name: string;
      quantity: number;
      status: string;
      notes: string | null;
      created_at: string;
      selected_options: Array<{ opzione: string }>;
      held_at: Date | null;
      reparto: string;
      mio_tavolo: boolean;
      ultimo_da: string | null;
    }[]
  >`
    select oi.id, t.code as table_code, mi.name as item_name, oi.quantity, oi.status,
           oi.notes, o.created_at, oi.selected_options, oi.held_at,
           coalesce(mc.reparto, 'cucina') as reparto,
           (t.assigned_to = ${userId}) as mio_tavolo,
           (select e.user_label from order_item_events e
             where e.order_item_id = oi.id and e.azione = 'stato'
             order by e.created_at desc limit 1) as ultimo_da
    from order_items oi
    join orders o on o.id = oi.order_id
    join table_sessions ts on ts.id = o.table_session_id
    join tables t on t.id = ts.table_id
    join menu_items mi on mi.id = oi.menu_item_id
    left join menu_categories mc on mc.id = mi.category_id
    where o.venue_id = ${venue.venueId} and oi.status not in ('served', 'cancelled')
    order by o.created_at asc`;

  return NextResponse.json({ items: rows });
}
