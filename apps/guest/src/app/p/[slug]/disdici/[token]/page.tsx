import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@repo/shared/db";
import { LinguaProvider } from "@repo/shared/i18n/contesto";
import type { LinguaUI } from "@repo/shared/i18n";
import { linguaPagina } from "@/lib/lingua";
import { tPrenota } from "@/i18n/prenota";
import { SelettoreLinguaUI } from "../../../../_i18n/selettore";
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
export async function generateMetadata({
  searchParams,
}: PageProps<"/p/[slug]/disdici/[token]">): Promise<Metadata> {
  const { lang } = await searchParams;
  const t = tPrenota(await linguaPagina(lang));
  return {
    title: t("disdici.meta.titolo"),
    // Il token sta nell'URL: questa pagina non deve finire nei motori.
    robots: { index: false, follow: false },
  };
}

/**
 * Giorno e ora della prenotazione nel fuso del locale.
 *
 * Non si può usare `t.data()`/`t.ora()`: non prendono un fuso orario e
 * formatterebbero con quello del server, che in produzione è UTC — una cena
 * di mezzanotte finirebbe scritta sul giorno prima. Il fuso resta quello del
 * locale, come in `formattaOrario`; cambia solo la lingua.
 */
function quando(d: Date, fuso: string, lingua: LinguaUI): string {
  return new Intl.DateTimeFormat(lingua === "en" ? "en-GB" : "it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fuso,
  }).format(d);
}

export default async function DisdiciPage({
  params,
  searchParams,
}: PageProps<"/p/[slug]/disdici/[token]">) {
  const { slug, token } = await params;
  const { lang } = await searchParams;
  const lingua = await linguaPagina(lang);
  const t = tPrenota(lingua);
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
    <LinguaProvider lingua={lingua}>
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
        <div className="mb-4 flex justify-end">
          <SelettoreLinguaUI attiva={lingua} />
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          {!r ? (
            <>
              <h1 className="text-lg font-semibold">{t("disdici.link.titolo")}</h1>
              <p className="mt-2 text-sm text-muted">{t("disdici.link.testo")}</p>
            </>
          ) : r.status === "cancelled" || r.disdetta_dal_cliente_at ? (
            <>
              <h1 className="text-lg font-semibold">{t("disdici.gia.titolo")}</h1>
              <p className="mt-2 text-sm text-muted">
                {t("disdici.gia.testo", {
                  nome: r.venue_name,
                  quando: quando(r.reserved_at, fuso, lingua),
                })}
              </p>
            </>
          ) : r.status === "declined" ? (
            <>
              <h1 className="text-lg font-semibold">{t("disdici.rifiutata.titolo")}</h1>
              <p className="mt-2 text-sm text-muted">
                {r.decline_reason
                  ? t("disdici.rifiutata.motivo", {
                      nome: r.venue_name,
                      motivo: r.decline_reason,
                    })
                  : t("disdici.rifiutata.senza_motivo", { nome: r.venue_name })}{" "}
                {t("disdici.rifiutata.niente")}
                {r.venue_phone &&
                  ` ${t("disdici.rifiutata.riprova", { telefono: r.venue_phone })}`}
              </p>
            </>
          ) : r.status === "seated" || r.status === "no_show" ? (
            <>
              <h1 className="text-lg font-semibold">{t("disdici.chiusa.titolo")}</h1>
              <p className="mt-2 text-sm text-muted">
                {t("disdici.chiusa.testo", { nome: r.venue_name })}
                {r.venue_phone && ` ${t("disdici.qualsiasi", { telefono: r.venue_phone })}`}
              </p>
            </>
          ) : r.passata ? (
            <>
              <h1 className="text-lg font-semibold">{t("disdici.passata.titolo")}</h1>
              <p className="mt-2 text-sm text-muted">
                {t("disdici.passata.testo", {
                  quando: quando(r.reserved_at, fuso, lingua),
                })}
                {r.venue_phone && ` ${t("disdici.qualsiasi", { telefono: r.venue_phone })}`}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold">{t("disdici.titolo")}</h1>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("disdici.locale")}</dt>
                  <dd className="font-medium">{r.venue_name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("disdici.quando")}</dt>
                  <dd className="font-medium">{quando(r.reserved_at, fuso, lingua)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("disdici.a_nome")}</dt>
                  <dd className="font-medium">{r.customer_name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("disdici.persone")}</dt>
                  <dd className="font-medium">{r.party_size}</dd>
                </div>
              </dl>

              <DisdiciForm token={token} />

              <p className="mt-4 text-xs text-muted">
                {r.venue_phone
                  ? t("disdici.cambio.telefono", { telefono: r.venue_phone })
                  : t("disdici.cambio")}
              </p>
            </>
          )}

          <p className="mt-5 border-t border-border pt-4 text-sm">
            <Link href={`/p/${slug}`} className="underline underline-offset-4">
              {t("disdici.torna")}
            </Link>
          </p>
        </div>
      </main>
    </LinguaProvider>
  );
}
