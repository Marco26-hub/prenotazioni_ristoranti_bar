import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { PrintButton } from "./print-button";

/**
 * Comande da stampare su carta. Volutamente non è una stampa ESC/POS su
 * stampante termica di rete: passando dal dialogo di stampa del browser
 * funziona con qualsiasi stampante già in cucina, senza driver né
 * configurazione IP.
 */
const REPARTI: Record<string, string> = {
  cucina: "Cucina",
  bar: "Bar",
  pizzeria: "Pizzeria",
  pasticceria: "Pasticceria",
};

export default async function PrintOrdersPage({
  searchParams,
}: PageProps<"/dashboard/orders/stampa">) {
  const params = await searchParams;
  const scelto = Array.isArray(params.reparto) ? params.reparto[0] : params.reparto;
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
    reparto: string;
  }

  const sql = db();
  const rows = await sql<ComandaRow[]>`
    select o.id as order_id, t.code as table_code, mi.name as item_name,
           oi.quantity, oi.notes, o.created_at,
           coalesce(mc.reparto, 'cucina') as reparto
    from order_items oi
    join orders o on o.id = oi.order_id
    join table_sessions ts on ts.id = o.table_session_id
    join tables t on t.id = ts.table_id
    join menu_items mi on mi.id = oi.menu_item_id
    left join menu_categories mc on mc.id = mi.category_id
    where o.venue_id = ${venue.venueId} and oi.status not in ('served', 'cancelled')
    order by o.created_at asc, mi.name`;

  // Presenti davvero adesso: mostrare "Pizzeria" a chi non ne ha una è una
  // scelta in più da leggere ogni volta senza motivo.
  const presenti = [...new Set(rows.map((r) => r.reparto))].sort();

  // Il foglio del bar non deve contenere i primi: chi lo stacca lo porta in
  // un posto dove quei piatti non si fanno.
  const righe = scelto && scelto !== "tutti"
    ? rows.filter((r) => r.reparto === scelto)
    : rows;

  const byOrder = new Map<string, ComandaRow[]>();
  for (const row of righe) {
    if (!byOrder.has(row.order_id)) byOrder.set(row.order_id, []);
    byOrder.get(row.order_id)!.push(row);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-5">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold">Comande da stampare</h1>
        <PrintButton />
      </div>

      {presenti.length > 1 && (
        <nav className="mb-4 flex flex-wrap gap-2 print:hidden">
          {["tutti", ...presenti].map((r) => {
            const attivo = (scelto ?? "tutti") === r;
            return (
              <a
                key={r}
                href={`/dashboard/orders/stampa?reparto=${r}`}
                className={`flex min-h-11 items-center rounded-full px-4 text-sm font-medium ${
                  attivo
                    ? "bg-accent text-accent-foreground"
                    : "border border-border"
                }`}
              >
                {r === "tutti" ? "Tutto" : (REPARTI[r] ?? r)}
              </a>
            );
          })}
        </nav>
      )}

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
              {(scelto ?? "tutti") === "tutti" && (
                <span className="ml-2 font-medium">
                  · {REPARTI[items[0].reparto] ?? items[0].reparto}
                </span>
              )}
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
