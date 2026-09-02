import { auth, signOut } from "@/auth";
import { db } from "@repo/shared/db";
import { formatPriceCents } from "@repo/shared";

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
    { table_id: string; total_cents: string | null }[]
  >`
    select ts.table_id, sum(oi.quantity * oi.unit_price_cents) as total_cents
    from table_sessions ts
    left join orders o on o.table_session_id = ts.id and o.status != 'cancelled'
    left join order_items oi on oi.order_id = o.id and oi.status != 'cancelled'
    where ts.venue_id = ${venue.venueId} and ts.status = 'open'
    group by ts.table_id`;

  const totalsByTable = new Map(
    openSessions.map((s) => [s.table_id, Number(s.total_cents ?? 0)])
  );

  return (
    <main className="mx-auto max-w-3xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{venue.venueName}</h1>
          <p className="text-sm text-gray-500">{session?.user.email}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="text-sm underline">
            Esci
          </button>
        </form>
      </header>

      <h2 className="mb-2 text-lg font-medium">Tavoli</h2>
      <ul className="divide-y rounded border">
        {tables.map((t) => {
          const total = totalsByTable.get(t.id);
          return (
            <li key={t.id} className="flex items-center justify-between p-3">
              <span>
                Tavolo {t.code} — {t.seats} posti
              </span>
              <span className="text-sm text-gray-600">
                {total ? formatPriceCents(total) : "libero"}
              </span>
            </li>
          );
        })}
        {tables.length === 0 && (
          <li className="p-3 text-sm text-gray-500">Nessun tavolo configurato.</li>
        )}
      </ul>
    </main>
  );
}
