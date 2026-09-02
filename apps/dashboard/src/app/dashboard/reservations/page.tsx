import Link from "next/link";
import { db } from "@repo/shared/db";
import { auth } from "@/auth";
import { addReservation, cancelReservation, setReservationStatus } from "./actions";

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  party_size: number;
  reserved_at: string;
  status: string;
  day: string;
}

const WEEKDAYS = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function ReservationsPage({
  searchParams,
}: PageProps<"/dashboard/reservations">) {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  const params = await searchParams;
  const today = isoDay(new Date());
  const selected =
    typeof params.giorno === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.giorno)
      ? params.giorno
      : today;

  // Il mese mostrato segue il giorno selezionato, così spostandosi avanti o
  // indietro la griglia resta coerente con quello che si sta guardando.
  const cursor = new Date(`${selected}T12:00:00Z`);
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const firstOfMonth = new Date(Date.UTC(year, month, 1, 12));
  const lastOfMonth = new Date(Date.UTC(year, month + 1, 0, 12));

  const sql = db();
  const reservations = await sql<Reservation[]>`
    select id, customer_name, customer_phone, party_size, reserved_at, status,
           (reserved_at at time zone 'Europe/Rome')::date::text as day
    from reservations
    where venue_id = ${venue.venueId}
      and (reserved_at at time zone 'Europe/Rome')::date
          between ${isoDay(firstOfMonth)}::date and ${isoDay(lastOfMonth)}::date
    order by reserved_at`;

  const byDay = new Map<string, Reservation[]>();
  for (const r of reservations) {
    if (r.status === "cancelled") continue;
    if (!byDay.has(r.day)) byDay.set(r.day, []);
    byDay.get(r.day)!.push(r);
  }

  // Lunedì come primo giorno della settimana (convenzione italiana).
  const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(leadingBlanks).fill(null);
  for (let d = 1; d <= lastOfMonth.getUTCDate(); d++) {
    cells.push(isoDay(new Date(Date.UTC(year, month, d, 12))));
  }

  const monthShift = (delta: number) =>
    isoDay(new Date(Date.UTC(year, month + delta, 1, 12)));

  const dayReservations = reservations.filter((r) => r.day === selected);
  const dayCovers = dayReservations
    .filter((r) => r.status !== "cancelled")
    .reduce((s, r) => s + r.party_size, 0);

  const monthLabel = firstOfMonth.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-5">
      <h1 className="text-lg font-semibold">Prenotazioni</h1>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <Link
            href={`/dashboard/reservations?giorno=${monthShift(-1)}`}
            aria-label="Mese precedente"
            className="min-h-11 rounded-full border border-border px-4 leading-[2.75rem]"
          >
            ←
          </Link>
          <p className="font-medium capitalize">{monthLabel}</p>
          <Link
            href={`/dashboard/reservations?giorno=${monthShift(1)}`}
            aria-label="Mese successivo"
            className="min-h-11 rounded-full border border-border px-4 leading-[2.75rem]"
          >
            →
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`b${i}`} />;
            const dayRes = byDay.get(iso) ?? [];
            const covers = dayRes.reduce((s, r) => s + r.party_size, 0);
            const isSelected = iso === selected;
            const isToday = iso === today;
            return (
              <Link
                key={iso}
                href={`/dashboard/reservations?giorno=${iso}`}
                className={`flex min-h-14 flex-col items-center justify-center rounded-lg border p-1 text-sm ${
                  isSelected
                    ? "border-accent bg-accent text-accent-foreground"
                    : dayRes.length
                      ? "border-accent/50 bg-accent/10"
                      : "border-border"
                }`}
              >
                <span className={isToday && !isSelected ? "font-bold underline" : ""}>
                  {Number(iso.slice(8, 10))}
                </span>
                {dayRes.length > 0 && (
                  <span className="text-[10px] leading-tight opacity-80">
                    {dayRes.length}p · {covers}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <p className="mt-2 text-xs text-muted">
          Su ogni giorno: numero di prenotazioni e coperti totali.
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">
            {new Date(`${selected}T12:00:00Z`).toLocaleDateString("it-IT", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })}
          </h2>
          <p className="text-sm text-muted">{dayCovers} coperti</p>
        </div>

        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {dayReservations.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className={r.status === "cancelled" ? "text-muted line-through" : ""}>
                  <strong className="tabular-nums">
                    {new Date(r.reserved_at).toLocaleTimeString("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>{" "}
                  {r.customer_name} · {r.party_size}p
                </p>
                {r.customer_phone && (
                  <a href={`tel:${r.customer_phone}`} className="text-sm text-muted underline">
                    {r.customer_phone}
                  </a>
                )}
              </div>

              {r.status !== "cancelled" && (
                <div className="flex shrink-0 gap-3 text-sm">
                  {r.status === "confirmed" && (
                    <form
                      action={async () => {
                        "use server";
                        await setReservationStatus(r.id, "seated");
                      }}
                    >
                      <button type="submit" className="underline">
                        Arrivato
                      </button>
                    </form>
                  )}
                  {r.status === "seated" && <span className="text-success">Arrivato</span>}
                  <form
                    action={async () => {
                      "use server";
                      await setReservationStatus(r.id, "no_show");
                    }}
                  >
                    <button type="submit" className="text-muted underline">
                      No-show
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await cancelReservation(r.id);
                    }}
                  >
                    <button type="submit" className="text-danger underline">
                      Annulla
                    </button>
                  </form>
                </div>
              )}
              {r.status === "no_show" && <span className="text-sm text-muted">No-show</span>}
            </li>
          ))}
          {dayReservations.length === 0 && (
            <li className="p-6 text-center text-sm text-muted">
              Nessuna prenotazione in questa giornata.
            </li>
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">Nuova prenotazione</h2>
        <form action={addReservation} className="space-y-2">
          <input
            name="customerName"
            placeholder="Nome cliente"
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <input
            name="phone"
            placeholder="Telefono (opzionale)"
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <input
            name="partySize"
            type="number"
            min="1"
            placeholder="Numero persone"
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <input
            name="reservedAt"
            type="datetime-local"
            defaultValue={`${selected}T20:00`}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <button
            type="submit"
            className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95"
          >
            Prenota
          </button>
        </form>
      </section>
    </main>
  );
}
