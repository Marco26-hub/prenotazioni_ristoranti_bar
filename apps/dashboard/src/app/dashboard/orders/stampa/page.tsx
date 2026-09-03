import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import Link from "next/link";
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
    item_id: string;
    table_code: string;
    item_name: string;
    quantity: number;
    notes: string | null;
    order_notes: string | null;
    guest_label: string | null;
    item_status: string;
    created_at: string;
    reparto: string;
    scelte: Array<{ opzione: string }>;
  }

  const sql = db();
  const rows = await sql<ComandaRow[]>`
    select o.id as order_id, oi.id as item_id, t.code as table_code,
           mi.name as item_name, oi.quantity, oi.notes,
           o.notes as order_notes, o.guest_label, oi.status as item_status,
           o.created_at,
           coalesce(mc.reparto, 'cucina') as reparto,
           oi.selected_options as scelte
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

  // Una comanda con bar e cucina deve produrre due fogli: mischiarli in uno
  // costringe chi lo ritira a separare a penna quello che va ai reparti.
  const byOrder = new Map<string, ComandaRow[]>();
  for (const row of righe) {
    const key = `${row.order_id}:${row.reparto}`;
    if (!byOrder.has(key)) byOrder.set(key, []);
    byOrder.get(key)!.push(row);
  }

  const totalePezzi = righe.reduce((totale, row) => totale + row.quantity, 0);
  const stato: Record<string, string> = {
    pending: "Da inviare",
    sent_to_kitchen: "In coda",
    preparing: "In preparazione",
    ready: "Pronto",
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-5">
      <div className="mb-5 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard/orders"
              className="mb-2 inline-flex min-h-10 items-center text-sm font-medium text-muted underline underline-offset-4"
            >
              ← Torna agli ordini in corso
            </Link>
            <h1 className="text-lg font-semibold">Comande da stampare</h1>
            <p className="mt-1 text-sm text-muted">
              Fogli separati per ordine e reparto, pronti per la cucina.
            </p>
          </div>
          <PrintButton />
        </div>

        <dl className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-surface p-3">
            <dt className="text-xs text-muted">Comande</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{byOrder.size}</dd>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <dt className="text-xs text-muted">Pezzi</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{totalePezzi}</dd>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <dt className="text-xs text-muted">Reparti</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{presenti.length}</dd>
          </div>
        </dl>
      </div>

      <header className="mb-6 hidden border-b-2 border-black pb-3 print:block">
        <h1 className="text-xl font-bold">{venue.venueName}</h1>
        <p className="text-sm">
          Comande aperte · {new Date().toLocaleString("it-IT")}
        </p>
      </header>

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

      {[...byOrder.entries()].map(([key, items]) => (
        <article
          key={key}
          className="mb-4 break-after-page border-b-2 border-dashed pb-4 last:border-0"
        >
          <header className="mb-3 flex items-start justify-between gap-4 border-b border-border pb-3 print:border-black">
            <div>
              <p className="text-2xl font-bold">Tavolo {items[0].table_code}</p>
              {items[0].guest_label && (
                <p className="mt-1 text-sm font-medium">Cliente: {items[0].guest_label}</p>
              )}
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">{REPARTI[items[0].reparto] ?? items[0].reparto}</p>
              <p className="text-muted print:text-black">
                Comanda #{items[0].order_id.slice(0, 8).toUpperCase()}
              </p>
              <time dateTime={items[0].created_at}>
                {new Date(items[0].created_at).toLocaleString("it-IT")}
              </time>
            </div>
          </header>
          {items[0].order_notes && (
            <p className="mb-3 border-l-4 border-accent pl-3 text-sm font-semibold print:border-black">
              Nota ordine: {items[0].order_notes}
            </p>
          )}
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.item_id} className="text-lg">
                <div className="flex items-start justify-between gap-3">
                  <span><strong>{item.quantity}×</strong> {item.item_name}</span>
                  <span className="shrink-0 text-xs font-medium uppercase text-muted print:text-black">
                    {stato[item.item_status] ?? item.item_status}
                  </span>
                </div>
                {/* Le varianti sulla carta, e in evidenza. Senza, chi lavora
                    sulla comanda stampata — il caso previsto per una cucina
                    senza schermo — prepara il piatto con l'ingrediente che il
                    cliente ha tolto. Se quell'ingrediente è un allergene non
                    è un fastidio, è un rischio. */}
                {item.scelte?.length > 0 && (
                  <div className="text-lg font-bold uppercase">
                    → {item.scelte.map((s) => s.opzione).join(" · ")}
                  </div>
                )}
                {item.notes && <div className="text-base italic">— {item.notes}</div>}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-border pt-2 text-right text-sm font-semibold print:border-black">
            {items.reduce((totale, item) => totale + item.quantity, 0)} pezzi
          </p>
        </article>
      ))}
    </main>
  );
}
