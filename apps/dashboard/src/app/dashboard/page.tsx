import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { formatPriceCents } from "@repo/shared";
import { closeTableInPerson } from "./close-table-actions";

export default async function DashboardPage() {
  const session = await auth();
  const venue = session?.venues[0];

  if (!venue) {
    return (
      <main className="p-4">
        <p>Nessun locale associato a questo utente.</p>
      </main>
    );
  }

  const sql = db();
  const tables = await sql<{ id: string; code: string; seats: number; active: boolean }[]>`
    select id, code, seats, active from tables
    where venue_id = ${venue.venueId}
    order by code`;

  const openSessions = await sql<
    { table_id: string; session_id: string; total_cents: string | null }[]
  >`
    select ts.table_id, ts.id as session_id, sum(oi.quantity * oi.unit_price_cents) as total_cents
    from table_sessions ts
    left join orders o on o.table_session_id = ts.id and o.status != 'cancelled'
    left join order_items oi on oi.order_id = o.id and oi.status != 'cancelled'
    where ts.venue_id = ${venue.venueId} and ts.status = 'open'
    group by ts.table_id, ts.id`;

  const openByTable = new Map(
    openSessions.map((s) => [
      s.table_id,
      { sessionId: s.session_id, totalCents: Number(s.total_cents ?? 0) },
    ])
  );

  const occupied = tables.filter((t) => openByTable.has(t.id)).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Sala</h1>
        <p className="text-sm text-muted">
          {occupied} di {tables.length} occupati
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tables.map((t) => {
          const open = openByTable.get(t.id);
          return (
            <li
              key={t.id}
              className={`rounded-xl border p-4 ${
                open ? "border-accent bg-accent/10" : "border-border bg-surface"
              }`}
            >
              <p className="font-semibold">{t.code}</p>
              <p className="text-xs text-muted">{t.seats} posti</p>
              <p className="mt-2 font-medium tabular-nums">
                {open ? (
                  formatPriceCents(open.totalCents)
                ) : (
                  <span className="text-muted">libero</span>
                )}
              </p>
              {open && (
                <form
                  action={async () => {
                    "use server";
                    await closeTableInPerson(open.sessionId);
                  }}
                >
                  <button type="submit" className="mt-2 text-sm underline">
                    Chiudi conto
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {tables.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Nessun tavolo configurato. Vai in <strong>QR e tavoli</strong> per aggiungerli.
        </p>
      )}
    </main>
  );
}
