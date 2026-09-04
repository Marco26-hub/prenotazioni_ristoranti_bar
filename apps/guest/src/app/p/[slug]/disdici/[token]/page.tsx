import Link from "next/link";
import { db } from "@repo/shared/db";
import { formattaOrario } from "@repo/shared/prenotazioni";
import { DisdiciForm } from "./form";

/**
 * Disdetta della prenotazione dal link ricevuto per email.
 *
 * Senza questa pagina, disdire vuol dire telefonare in orario di servizio:
 * molti non lo fanno, e il locale scopre alle nove che quel tavolo non
 * arriva. Un tavolo liberato la mattina si riempie ancora.
 *
 * Il token è l'unica autorizzazione e non dà accesso a nient'altro: chi ce
 * l'ha è chi ha ricevuto l'email di conferma.
 */
export const metadata = {
  title: "Disdici la prenotazione",
  // Il token sta nell'URL: questa pagina non deve finire nei motori.
  robots: { index: false, follow: false },
};

export default async function DisdiciPage({
  params,
}: PageProps<"/p/[slug]/disdici/[token]">) {
  const { slug, token } = await params;
  const sql = db();

  const [r] = await sql<
    {
      id: string;
      customer_name: string;
      party_size: number;
      reserved_at: Date;
      status: string;
      decline_reason: string | null;
      disdetta_dal_cliente_at: Date | null;
      venue_name: string;
      venue_phone: string | null;
      timezone: string | null;
      passata: boolean;
    }[]
  >`
    select r.id, r.customer_name, r.party_size, r.reserved_at, r.status,
           r.decline_reason,
           r.disdetta_dal_cliente_at,
           v.name as venue_name, v.public_phone as venue_phone, v.timezone,
           r.reserved_at < now() as passata
      from reservations r
      join venues v on v.id = r.venue_id
     where r.cancel_token = ${token} and v.slug = ${slug}`;

  const fuso = r?.timezone ?? "Europe/Rome";

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <div className="rounded-xl border border-border bg-surface p-6">
        {!r ? (
          <>
            <h1 className="text-lg font-semibold">Link non valido</h1>
            <p className="mt-2 text-sm text-muted">
              Questo link non corrisponde a nessuna prenotazione. Può essere
              scaduto, o già usato. Per disdire chiama direttamente il locale.
            </p>
          </>
        ) : r.status === "cancelled" || r.disdetta_dal_cliente_at ? (
          <>
            <h1 className="text-lg font-semibold">Già disdetta</h1>
            <p className="mt-2 text-sm text-muted">
              La prenotazione da {r.venue_name} del{" "}
              {formattaOrario(r.reserved_at, fuso)} risulta disdetta. Non devi
              fare altro.
            </p>
          </>
        ) : r.status === "declined" ? (
          <>
            <h1 className="text-lg font-semibold">Richiesta non accolta</h1>
            <p className="mt-2 text-sm text-muted">
              {r.venue_name} non ha potuto accogliere questa richiesta
              {r.decline_reason ? `: ${r.decline_reason}` : "."} Non c&apos;è
              niente da disdire.
              {r.venue_phone && ` Per riprovare: ${r.venue_phone}.`}
            </p>
          </>
        ) : r.status === "seated" || r.status === "no_show" ? (
          <>
            <h1 className="text-lg font-semibold">Prenotazione già chiusa</h1>
            <p className="mt-2 text-sm text-muted">
              Risulta che la serata sia già passata da {r.venue_name}: non si
              può più disdire.
              {r.venue_phone && ` Per qualsiasi cosa: ${r.venue_phone}.`}
            </p>
          </>
        ) : r.passata ? (
          <>
            <h1 className="text-lg font-semibold">Prenotazione passata</h1>
            <p className="mt-2 text-sm text-muted">
              Era per {formattaOrario(r.reserved_at, fuso)} e non si può più
              disdire.
              {r.venue_phone && ` Per qualsiasi cosa: ${r.venue_phone}.`}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">Disdici la prenotazione</h1>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Locale</dt>
                <dd className="font-medium">{r.venue_name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Quando</dt>
                <dd className="font-medium">
                  {formattaOrario(r.reserved_at, fuso)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">A nome di</dt>
                <dd className="font-medium">{r.customer_name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Persone</dt>
                <dd className="font-medium">{r.party_size}</dd>
              </div>
            </dl>

            <DisdiciForm token={token} />

            <p className="mt-4 text-xs text-muted">
              Se invece vuoi solo cambiare orario o numero di persone, non
              disdire: chiama il locale
              {r.venue_phone ? ` al ${r.venue_phone}` : ""}, è più veloce che
              rifare tutto.
            </p>
          </>
        )}

        <p className="mt-5 border-t border-border pt-4 text-sm">
          <Link href={`/p/${slug}`} className="underline underline-offset-4">
            Torna alle prenotazioni
          </Link>
        </p>
      </div>
    </main>
  );
}
