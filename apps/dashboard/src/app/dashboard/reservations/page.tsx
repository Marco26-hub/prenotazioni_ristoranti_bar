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
    <main className="mx-auto max-w-2xl space-y-8 p-4">
      <h1 className="text-xl font-semibold">Prenotazioni</h1>

      <ul className="divide-y rounded border">
        {reservations.map((r) => (
          <li key={r.id} className="flex items-center justify-between p-3">
            <div>
              <p className={r.status === "cancelled" ? "text-gray-400 line-through" : ""}>
                {new Date(r.reserved_at).toLocaleString("it-IT")} — {r.customer_name} (
                {r.party_size} persone)
              </p>
              {r.customer_phone && <p className="text-sm text-gray-500">{r.customer_phone}</p>}
            </div>
            {r.status !== "cancelled" && (
              <form
                action={async () => {
                  "use server";
                  await cancelReservation(r.id);
                }}
              >
                <button type="submit" className="text-sm text-red-600 underline">
                  Annulla
                </button>
              </form>
            )}
          </li>
        ))}
        {reservations.length === 0 && (
          <li className="p-3 text-sm text-gray-500">Nessuna prenotazione.</li>
        )}
      </ul>

      <section className="rounded border p-4">
        <h2 className="mb-2 font-medium">Nuova prenotazione</h2>
        <form action={addReservation} className="space-y-2">
          <input name="customerName" placeholder="Nome cliente" required className="w-full rounded border p-2" />
          <input name="phone" placeholder="Telefono (opzionale)" className="w-full rounded border p-2" />
          <input
            name="partySize"
            type="number"
            min="1"
            placeholder="Numero persone"
            required
            className="w-full rounded border p-2"
          />
          <input name="reservedAt" type="datetime-local" required className="w-full rounded border p-2" />
          <button type="submit" className="w-full rounded bg-black py-2 text-white">
            Prenota
          </button>
        </form>
      </section>
    </main>
  );
}
