import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { formatPriceCents } from "@repo/shared";

interface DayRow {
  order_id: string;
  created_at: string;
  table_code: string;
  item_name: string;
  quantity: number;
  unit_price_cents: number;
  order_status: string;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Storico ordini di una giornata, con incasso ordinato e coperti serviti. */
export default async function OrdersHistoryPage({
  searchParams,
}: PageProps<"/dashboard/orders/storico">) {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  const params = await searchParams;
  const requested = typeof params.giorno === "string" ? params.giorno : undefined;
  const day = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : isoDay(new Date());

  const sql = db();

  // La giornata di un ristorante non coincide con la mezzanotte UTC: si usa
  // il fuso del locale, altrimenti gli ordini di fine serata finirebbero nel
  // giorno dopo.
  const rows = await sql<DayRow[]>`
    select o.id as order_id, o.created_at, t.code as table_code, mi.name as item_name,
           oi.quantity, oi.unit_price_cents, o.status as order_status
    from order_items oi
    join orders o on o.id = oi.order_id
    join table_sessions ts on ts.id = o.table_session_id
    join tables t on t.id = ts.table_id
    join menu_items mi on mi.id = oi.menu_item_id
    where o.venue_id = ${venue.venueId}
      and (o.created_at at time zone 'Europe/Rome')::date = ${day}::date
      and o.status != 'cancelled' and oi.status != 'cancelled'
    order by o.created_at desc`;

  const paid = await sql<{ total: string | null }[]>`
    select sum(amount_cents + coalesce(tip_cents, 0)) as total
    from payments
    where venue_id = ${venue.venueId} and status = 'succeeded'
      and (created_at at time zone 'Europe/Rome')::date = ${day}::date`;

  const orderedCents = rows.reduce((s, r) => s + r.quantity * r.unit_price_cents, 0);
  const paidCents = Number(paid[0]?.total ?? 0);
  const orderIds = new Set(rows.map((r) => r.order_id));

  const byOrder = new Map<string, DayRow[]>();
  for (const r of rows) {
    if (!byOrder.has(r.order_id)) byOrder.set(r.order_id, []);
    byOrder.get(r.order_id)!.push(r);
  }

  const shift = (days: number) => {
    const d = new Date(`${day}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return isoDay(d);
  };

  const topItems = [...rows
    .reduce((m, r) => {
      const cur = m.get(r.item_name) ?? 0;
      m.set(r.item_name, cur + r.quantity);
      return m;
    }, new Map<string, number>())
    .entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Storico ordini</h1>
        <Link href="/dashboard/orders" className="text-sm underline">
          Ordini in corso
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <Link
          href={`/dashboard/orders/storico?giorno=${shift(-1)}`}
          className="min-h-11 rounded-full border border-border px-4 text-sm leading-[2.75rem]"
        >
          ← Giorno prima
        </Link>
        <input
          type="date"
          name="giorno"
          defaultValue={day}
          className="min-h-11 rounded-lg border border-border bg-background px-3"
        />
        <button
          type="submit"
          className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground"
        >
          Vai
        </button>
        <Link
          href={`/dashboard/orders/storico?giorno=${shift(1)}`}
          className="min-h-11 rounded-full border border-border px-4 text-sm leading-[2.75rem]"
        >
          Giorno dopo →
        </Link>
      </form>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Ordinato</p>
          <p className="text-lg font-semibold tabular-nums">{formatPriceCents(orderedCents)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Incassato</p>
          <p className="text-lg font-semibold tabular-nums">{formatPriceCents(paidCents)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Ordini</p>
          <p className="text-lg font-semibold tabular-nums">{orderIds.size}</p>
        </div>
      </section>

      {paidCents !== orderedCents && orderIds.size > 0 && (
        <p className="text-xs text-muted">
          Ordinato e incassato non coincidono quando un conto è stato pagato in
          contanti, è ancora aperto, oppure include una mancia.
        </p>
      )}

      {topItems.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-2 font-semibold">Più ordinati</h2>
          <ul className="space-y-1 text-sm">
            {topItems.map(([name, qty]) => (
              <li key={name} className="flex justify-between">
                <span>{name}</span>
                <span className="tabular-nums text-muted">{qty}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        {[...byOrder.entries()].map(([orderId, items]) => (
          <article key={orderId} className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="font-semibold">Tavolo {items[0].table_code}</p>
              <p className="text-xs text-muted">
                {new Date(items[0].created_at).toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <ul className="space-y-0.5 text-sm">
              {items.map((i, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>
                    {i.quantity}× {i.item_name}
                  </span>
                  <span className="tabular-nums text-muted">
                    {formatPriceCents(i.quantity * i.unit_price_cents)}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}

        {orderIds.size === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            Nessun ordine in questa giornata.
          </p>
        )}
      </section>
    </main>
  );
}
