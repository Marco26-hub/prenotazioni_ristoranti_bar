import { db } from "@repo/shared/db";
import { auth } from "@/auth";
import { addReservation, cancelReservation } from "./actions";

export default async function ReservationsPage() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  const sql = db();
  const reservations = await sql<
    {
      id: string;
      customer_name: string;
      customer_phone: string | null;
      party_size: number;
      reserved_at: string;
      status: string;
    }[]
  >`
    select id, customer_name, customer_phone, party_size, reserved_at, status
    from reservations
    where venue_id = ${venue.venueId} and reserved_at >= now() - interval '1 day'
    order by reserved_at asc`;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-5">
      <h1 className="text-lg font-semibold">Prenotazioni</h1>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {reservations.map((r) => (
          <li key={r.id} className="flex items-center justify-between p-3">
            <div>
              <p className={r.status === "cancelled" ? "text-muted line-through" : ""}>
                {new Date(r.reserved_at).toLocaleString("it-IT")} — {r.customer_name} (
                {r.party_size} persone)
              </p>
              {r.customer_phone && <p className="text-sm text-muted">{r.customer_phone}</p>}
            </div>
            {r.status !== "cancelled" && (
              <form
                action={async () => {
                  "use server";
                  await cancelReservation(r.id);
                }}
              >
                <button type="submit" className="text-sm text-danger underline">
                  Annulla
                </button>
              </form>
            )}
          </li>
        ))}
        {reservations.length === 0 && (
          <li className="p-3 text-sm text-muted">Nessuna prenotazione.</li>
        )}
      </ul>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">Nuova prenotazione</h2>
        <form action={addReservation} className="space-y-2">
          <input name="customerName" placeholder="Nome cliente" required className="min-h-11 w-full rounded-lg border border-border bg-background px-3" />
          <input name="phone" placeholder="Telefono (opzionale)" className="min-h-11 w-full rounded-lg border border-border bg-background px-3" />
          <input
            name="partySize"
            type="number"
            min="1"
            placeholder="Numero persone"
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <input name="reservedAt" type="datetime-local" required className="min-h-11 w-full rounded-lg border border-border bg-background px-3" />
          <button type="submit" className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95">
            Prenota
          </button>
        </form>
      </section>
    </main>
  );
}
