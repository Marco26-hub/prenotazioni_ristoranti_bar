import QRCode from "qrcode";
import { db } from "@repo/shared/db";
import { auth } from "@/auth";
import {
  addTable,
  toggleTableActive,
  updateTable,
  regenerateQrToken,
  deleteTable,
} from "./actions";

export default async function TablesPage() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  const sql = db();
  const [venueRow] = await sql<{ slug: string }[]>`
    select slug from venues where id = ${venue.venueId}`;
  if (!venueRow) return <main className="p-4">Locale non trovato.</main>;

  const tables = await sql<
    { id: string; code: string; seats: number; qr_token: string; active: boolean }[]
  >`select id, code, seats, qr_token, active from tables where venue_id = ${venue.venueId} order by code`;

  const guestAppUrl = process.env.GUEST_APP_URL ?? "http://localhost:3010";

  const tablesWithQr = await Promise.all(
    tables.map(async (t) => {
      const url = `${guestAppUrl}/v/${venueRow.slug}/t/${t.qr_token}`;
      const qrDataUrl = await QRCode.toDataURL(url, { width: 240 });
      return { ...t, url, qrDataUrl };
    })
  );

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-4">
      <h1 className="text-xl font-semibold">Gestione tavoli</h1>

      <ul className="grid grid-cols-2 gap-4">
        {tablesWithQr.map((t) => (
          <li key={t.id} className="rounded border p-4 text-center">
            <p className="mb-2 font-medium">
              Tavolo {t.code} — {t.seats} posti
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.qrDataUrl} alt={`QR tavolo ${t.code}`} className="mx-auto" />
            <a
              href={t.qrDataUrl}
              download={`qr-tavolo-${t.code}.png`}
              className="mt-2 block text-sm underline"
            >
              Scarica PNG
            </a>
            <p className="mt-1 break-all text-xs text-gray-500">{t.url}</p>

            <form action={updateTable} className="mt-3 flex gap-1">
              <input type="hidden" name="tableId" value={t.id} />
              <input
                name="code"
                defaultValue={t.code}
                required
                className="w-full min-w-0 rounded border p-1 text-sm"
              />
              <input
                name="seats"
                type="number"
                min="1"
                defaultValue={t.seats}
                className="w-14 rounded border p-1 text-sm"
              />
              <button type="submit" className="rounded border px-2 text-sm">
                Salva
              </button>
            </form>

            <div className="mt-2 flex flex-wrap justify-center gap-3 text-sm">
              <form
                action={async () => {
                  "use server";
                  await toggleTableActive(t.id, !t.active);
                }}
              >
                <button type="submit" className="underline">
                  {t.active ? "Disattiva" : "Riattiva"}
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await regenerateQrToken(t.id);
                }}
              >
                <button type="submit" className="underline">
                  Rigenera QR
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await deleteTable(t.id);
                }}
              >
                <button type="submit" className="text-red-600 underline">
                  Elimina
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-gray-500">
        Rigenerando il QR gli adesivi già stampati per quel tavolo smettono di
        funzionare e vanno ristampati. Un tavolo con ordini a storico non viene
        cancellato ma solo disattivato, per non perdere i dati contabili.
      </p>

      <section className="rounded border p-4">
        <h2 className="mb-2 font-medium">Aggiungi tavolo</h2>
        <form action={addTable} className="flex gap-2">
          <input name="code" placeholder="Codice (es. T3)" required className="flex-1 rounded border p-2" />
          <input
            name="seats"
            type="number"
            min="1"
            defaultValue={2}
            className="w-20 rounded border p-2"
          />
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">
            Aggiungi
          </button>
        </form>
      </section>
    </main>
  );
}
