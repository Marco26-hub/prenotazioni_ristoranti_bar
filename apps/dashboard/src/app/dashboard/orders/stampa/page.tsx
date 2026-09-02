import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { PrintButton } from "./print-button";

/**
 * Comande da stampare su carta. Volutamente non è una stampa ESC/POS su
 * stampante termica di rete: passando dal dialogo di stampa del browser
 * funziona con qualsiasi stampante già in cucina, senza driver né
 * configurazione IP.
 */
export default async function PrintOrdersPage() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  interface ComandaRow {
    order_id: string;
    table_code: string;
    item_name: string;
    quantity: number;
    notes: string | null;
    created_at: string;
  }

  const sql = db();
  const rows = await sql<ComandaRow[]>`
    select o.id as order_id, t.code as table_code, mi.name as item_name,
           oi.quantity, oi.notes, o.created_at
    from order_items oi
    join orders o on o.id = oi.order_id
    join table_sessions ts on ts.id = o.table_session_id
    join tables t on t.id = ts.table_id
    join menu_items mi on mi.id = oi.menu_item_id
    where o.venue_id = ${venue.venueId} and oi.status not in ('served', 'cancelled')
    order by o.created_at asc, mi.name`;

  const byOrder = new Map<string, ComandaRow[]>();
  for (const row of rows) {
    if (!byOrder.has(row.order_id)) byOrder.set(row.order_id, []);
    byOrder.get(row.order_id)!.push(row);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-5">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold">Comande da stampare</h1>
        <PrintButton />
      </div>

      {byOrder.size === 0 && (
        <p className="text-sm text-muted">Nessuna comanda in corso.</p>
      )}

      {[...byOrder.entries()].map(([orderId, items]) => (
        <article
          key={orderId}
          className="mb-4 break-after-page border-b-2 border-dashed pb-4 last:border-0"
        >
          <header className="mb-2">
            <p className="text-2xl font-bold">Tavolo {items[0].table_code}</p>
            <p className="text-sm">
              {new Date(items[0].created_at).toLocaleString("it-IT")}
            </p>
          </header>
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li key={i} className="text-lg">
                <strong>{item.quantity}×</strong> {item.item_name}
                {item.notes && <div className="text-base italic">— {item.notes}</div>}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </main>
  );
}
