import QRCode from "qrcode";
import { db } from "@repo/shared/db";
import { auth } from "@/auth";
import { ScaricaLocandina } from "./scarica-locandina";
import { PdfTutti } from "./pdf-tutti";
import { moduloAttivo } from "@/lib/authz";
import { ModuloNonAttivo } from "../modulo-non-attivo";
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

  // Il modulo si verifica qui e non solo nel menu: chi digita
  // l'indirizzo la pagina la otterrebbe lo stesso.
  if (!(await moduloAttivo(venue.venueId, "ordini"))) {
    return <ModuloNonAttivo modulo="ordini" />;
  }

  const sql = db();
  const [venueRow] = await sql<
    { slug: string; name: string; logo_url: string | null; brand_color: string | null }[]
  >`select slug, name, logo_url, brand_color from venues where id = ${venue.venueId}`;
  if (!venueRow) return <main className="p-4">Locale non trovato.</main>;

  const tables = await sql<
    { id: string; code: string; seats: number; qr_token: string; active: boolean }[]
  >`select id, code, seats, qr_token, active from tables where venue_id = ${venue.venueId} order by code`;

  /*
   * L'indirizzo dell'app cliente non si indovina.
   *
   * Qui si generano i QR che il locale manda in tipografia. Un ripiego su
   * localhost produceva cavalierini stampati e messi sui tavoli che nessun
   * telefono può aprire: la spesa è già fatta e il difetto si scopre dal
   * primo cliente che inquadra. In sviluppo localhost è giusto; in
   * produzione, senza la variabile, la pagina lo dice e non stampa nulla.
   */
  const guestAppUrl =
    process.env.GUEST_APP_URL ??
    (process.env.NODE_ENV === "production" ? null : "http://localhost:3010");

  if (!guestAppUrl) {
    return (
      <main className="mx-auto max-w-4xl p-4">
        <h1 className="text-xl font-semibold">QR e tavoli</h1>
        <p
          role="alert"
          className="mt-3 rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          Manca l&apos;indirizzo dell&apos;app cliente (GUEST_APP_URL), quindi i
          QR non si possono generare: stamparli adesso vorrebbe dire mettere
          sui tavoli codici che non aprono niente. Scrivi a chi gestisce la
          piattaforma prima di mandare qualcosa in tipografia.
        </p>
      </main>
    );
  }


  const tablesWithQr = await Promise.all(
    tables.map(async (t) => {
      const url = `${guestAppUrl}/v/${venueRow.slug}/t/${t.qr_token}`;
      // Due risoluzioni: una per lo schermo, una per la stampa. Ingrandire
      // quella da schermo fino ad A6 darebbe un QR sgranato che lo scanner
      // fatica a leggere.
      const qrDataUrl = await QRCode.toDataURL(url, { width: 240 });
      const qrStampa = await QRCode.toDataURL(url, { width: 1200, margin: 1 });
      return { ...t, url, qrDataUrl, qrStampa };
    })
  );

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-5">
      <h1 className="text-lg font-semibold">Gestione tavoli</h1>

      <PdfTutti
        nomeLocale={venueRow.name}
        tavoli={tablesWithQr.map((t) => ({
          codice: t.code,
          qrDataUrl: t.qrStampa,
          nomeLocale: venueRow.name,
          logoUrl: venueRow.logo_url,
          coloreMarchio: venueRow.brand_color,
        }))}
      />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tablesWithQr.map((t) => (
          <li key={t.id} className="rounded border p-4 text-center">
            <p className="mb-2 font-medium">
              Tavolo {t.code} — {t.seats} posti
            </p>
            <p className="mb-2 text-xs text-muted">
              Il codice identifica il tavolo; il QR collega ordine e pagamento.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.qrDataUrl} alt={`QR tavolo ${t.code}`} className="mx-auto h-auto w-full max-w-56" />
            <ScaricaLocandina
              dati={{
                codice: t.code,
                qrDataUrl: t.qrStampa,
                nomeLocale: venueRow.name,
                logoUrl: venueRow.logo_url,
                coloreMarchio: venueRow.brand_color,
              }}
            />
            <p className="mt-1 break-all text-xs text-muted">{t.url}</p>

            <form action={updateTable} className="mt-3 flex gap-1">
              <input type="hidden" name="tableId" value={t.id} />
              <input
                name="code"
                defaultValue={t.code}
                required
                className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-sm"
              />
              <input
                name="seats"
                type="number"
                min="1"
                defaultValue={t.seats}
                className="min-h-11 w-16 rounded-lg border border-border bg-background px-2 text-sm"
              />
              <button type="submit" className="min-h-11 rounded-lg border border-border px-3 text-sm">
                Salva
              </button>
            </form>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 text-sm">
              <form
                action={async () => {
                  "use server";
                  await toggleTableActive(t.id, !t.active);
                }}
              >
                <button type="submit" className="flex min-h-11 items-center px-1 underline">
                  {t.active ? "Disattiva" : "Riattiva"}
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await regenerateQrToken(t.id);
                }}
              >
                <button type="submit" className="flex min-h-11 items-center px-1 underline">
                  Rigenera QR
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await deleteTable(t.id);
                }}
              >
                <button type="submit" className="flex min-h-11 items-center px-1 text-danger underline">
                  Elimina
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">
        Rigenerando il QR gli adesivi già stampati per quel tavolo smettono di
        funzionare e vanno ristampati. Un tavolo con ordini a storico non viene
        cancellato ma solo disattivato, per non perdere i dati contabili.
      </p>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">Aggiungi tavolo</h2>
        {/* Su telefono i tre campi in fila non ci stanno e spingono il
            bottone oltre lo schermo, facendo scorrere tutta la pagina in
            orizzontale: vanno a capo finché non c'è spazio vero. */}
        <form action={addTable} className="flex flex-wrap gap-2">
          <input
            name="code"
                placeholder="Codice tavolo (es. T3)"
            required
            className="min-h-11 w-full min-w-0 flex-1 rounded-lg border border-border bg-background px-3 sm:w-auto"
          />
          <input
            name="seats"
            type="number"
            min="1"
            defaultValue={2}
            aria-label="Posti a sedere"
            className="min-h-11 w-20 rounded-lg border border-border bg-background px-3"
          />
          <button
            type="submit"
            className="min-h-11 flex-1 rounded-full bg-accent px-5 font-medium text-accent-foreground active:scale-95 sm:flex-none"
          >
            Aggiungi
          </button>
        </form>
      </section>
    </main>
  );
}
