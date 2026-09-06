import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";
import { LinguaProvider } from "@repo/shared/i18n/contesto";
import { linguaPagina } from "@/lib/lingua";
import { tLegale } from "@/i18n/legale";

/**
 * Informativa privacy del singolo locale.
 *
 * Il titolare del trattamento è il locale, non noi: un'informativa unica e
 * generica non sarebbe conforme, perché l'interessato ha diritto di sapere
 * a chi rivolgersi (art. 13.1.a GDPR). I dati del titolare vengono quindi
 * dalla scheda del locale, e dove mancano il documento lo dichiara invece
 * di far finta che ci siano.
 *
 * Il nome del locale non si traduce mai: è quello che l'interessato deve
 * poter citare in un reclamo.
 */

interface VenuePrivacy {
  lingua_predefinita: string;
  name: string;
  vat_number: string | null;
  fiscal_code: string | null;
  address: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_province: string | null;
  public_email: string | null;
  public_phone: string | null;
  pec: string | null;
  brand_color: string | null;
}

async function loadVenue(slug: string): Promise<VenuePrivacy | null> {
  const sql = db();
  const [v] = await sql<VenuePrivacy[]>`
    select name, vat_number, fiscal_code, address, address_zip, address_city,
           address_province, public_email, public_phone, pec, brand_color,
           lingua_predefinita
      from venues where slug = ${slug}`;
  return v ?? null;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/privacy/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await searchParams;
  const v = await loadVenue(slug);
  const t = tLegale(await linguaPagina(lang, v?.lingua_predefinita));
  return {
    title: v ? t("privacy.locale.meta", { nome: v.name }) : t("privacy.titolo"),
    // Un'informativa non è contenuto da posizionare: è un documento di
    // servizio, e indicizzarla disperde l'autorità delle pagine che contano.
    robots: { index: false, follow: true },
  };
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="pt-3 font-semibold">{titolo}</h2>
      {children}
    </section>
  );
}

export default async function PrivacyLocalePage({
  params,
  searchParams,
}: PageProps<"/privacy/[slug]">) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const venue = await loadVenue(slug);
  const lingua = await linguaPagina(lang, venue?.lingua_predefinita);
  const t = tLegale(lingua);
  if (!venue) notFound();

  const indirizzo = [
    venue.address,
    venue.address_zip,
    venue.address_city,
    venue.address_province && `(${venue.address_province})`,
  ]
    .filter(Boolean)
    .join(" ");

  const contatti = [venue.public_email, venue.pec, venue.public_phone].filter(Boolean);
  const identificativo = venue.vat_number
    ? t("privacy.locale.piva", { numero: venue.vat_number })
    : venue.fiscal_code
      ? t("privacy.locale.cf", { codice: venue.fiscal_code })
      : null;

  const incompleto = !indirizzo || contatti.length === 0 || !identificativo;

  return (
    <LinguaProvider lingua={lingua}>
      <main
        className="mx-auto max-w-2xl space-y-4 px-4 py-6 text-sm leading-relaxed"
        style={
          venue.brand_color
            ? ({ "--accent": venue.brand_color } as React.CSSProperties)
            : undefined
        }
      >
        <h1 className="text-2xl font-semibold tracking-tight">{t("privacy.titolo")}</h1>

        {/* L'italiano è il testo che fa fede: chi legge l'inglese deve saperlo
            prima di leggere il resto, non in fondo. */}
        {t.lingua === "en" && (
          <p className="text-muted">{t("legale.prevalenza")}</p>
        )}

        <p className="text-muted">
          {t("privacy.locale.sommario.a")} <strong>{venue.name}</strong>{" "}
          {t("privacy.locale.sommario.b")}
        </p>

        <Sezione titolo={t("privacy.locale.chi.titolo")}>
          <p>
            {t("privacy.locale.chi.a")} <strong>{venue.name}</strong>
            {identificativo ? `, ${identificativo}` : ""}
            {indirizzo ? t("privacy.locale.sede", { indirizzo }) : ""}.
          </p>
          {contatti.length > 0 ? (
            <p>{t("privacy.locale.contatti", { elenco: contatti.join(" — ") })}</p>
          ) : (
            <p>{t("privacy.locale.contatti.mancanti")}</p>
          )}
          {incompleto && (
            <p className="rounded-lg border border-border bg-surface p-3 text-muted">
              {t("privacy.locale.incompleto")}
            </p>
          )}
          <p>{t("privacy.locale.responsabile")}</p>
        </Sezione>

        <Sezione titolo={t("privacy.locale.dati.titolo")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">
                    {t("privacy.locale.tabella.dati")}
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    {t("privacy.locale.tabella.finalita")}
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    {t("privacy.locale.tabella.base")}
                  </th>
                  <th className="py-2 font-medium">
                    {t("privacy.locale.tabella.conservazione")}
                  </th>
                </tr>
              </thead>
              <tbody className="align-top">
                <tr className="border-b border-border/70">
                  <td className="py-2 pr-3">{t("privacy.locale.ordine.dati")}</td>
                  <td className="py-2 pr-3">{t("privacy.locale.ordine.finalita")}</td>
                  <td className="py-2 pr-3">{t("privacy.locale.base.contratto")}</td>
                  <td className="py-2">{t("privacy.locale.ordine.conservazione")}</td>
                </tr>
                <tr className="border-b border-border/70">
                  <td className="py-2 pr-3">{t("privacy.locale.pagamento.dati")}</td>
                  <td className="py-2 pr-3">
                    {t("privacy.locale.pagamento.finalita")}
                  </td>
                  <td className="py-2 pr-3">{t("privacy.locale.base.contratto")}</td>
                  <td className="py-2">
                    {t("privacy.locale.pagamento.conservazione")}
                  </td>
                </tr>
                <tr className="border-b border-border/70">
                  <td className="py-2 pr-3">{t("privacy.locale.fattura.dati")}</td>
                  <td className="py-2 pr-3">{t("privacy.locale.fattura.finalita")}</td>
                  <td className="py-2 pr-3">{t("privacy.locale.base.obbligo")}</td>
                  <td className="py-2">{t("privacy.locale.fattura.conservazione")}</td>
                </tr>
                <tr className="border-b border-border/70">
                  <td className="py-2 pr-3">
                    {t("privacy.locale.prenotazione.dati")}
                  </td>
                  <td className="py-2 pr-3">
                    {t("privacy.locale.prenotazione.finalita")}
                  </td>
                  <td className="py-2 pr-3">
                    {t("privacy.locale.base.precontrattuale")}
                  </td>
                  <td className="py-2">
                    {t("privacy.locale.prenotazione.conservazione")}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">{t("privacy.locale.ip.dati")}</td>
                  <td className="py-2 pr-3">{t("privacy.locale.ip.finalita")}</td>
                  <td className="py-2 pr-3">{t("privacy.locale.base.interesse")}</td>
                  <td className="py-2">{t("privacy.locale.ip.conservazione")}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted">{t("privacy.locale.salute")}</p>
        </Sezione>

        <Sezione titolo={t("privacy.locale.carta.titolo")}>
          <p>{t("privacy.locale.carta.testo")}</p>
        </Sezione>

        <Sezione titolo={t("privacy.locale.destinatari.titolo")}>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>{t("privacy.locale.destinatari.piattaforma.forte")}</strong>{" "}
              {t("privacy.locale.destinatari.piattaforma.testo")}
            </li>
            <li>
              <strong>{t("privacy.locale.destinatari.hosting.forte")}</strong>{" "}
              {t("privacy.locale.destinatari.hosting.testo")}
            </li>
            <li>
              <strong>{t("privacy.locale.destinatari.pagamento.forte")}</strong>{" "}
              {t("privacy.locale.destinatari.pagamento.testo")}
            </li>
            <li>
              <strong>{t("privacy.locale.destinatari.fattura.forte")}</strong>
              {t("privacy.locale.destinatari.fattura.mezzo")}{" "}
              <strong>{t("privacy.locale.destinatari.fattura.agenzia")}</strong>{" "}
              {t("privacy.locale.destinatari.fattura.fine")}
            </li>
            <li>
              <strong>{t("privacy.locale.destinatari.cassa.forte")}</strong>
              {t("privacy.locale.destinatari.cassa.testo")}
            </li>
          </ul>
          <p>{t("privacy.locale.destinatari.nota")}</p>
        </Sezione>

        <Sezione titolo={t("privacy.locale.trasferimenti.titolo")}>
          <p>{t("privacy.locale.trasferimenti.testo")}</p>
        </Sezione>

        <Sezione titolo={t("privacy.locale.cookie.titolo")}>
          <p>
            {t("privacy.locale.cookie.a")}{" "}
            <a href="/cookie" className="underline underline-offset-2">
              {t("cookie.link")}
            </a>
            .
          </p>
        </Sezione>

        <Sezione titolo={t("privacy.locale.diritti.titolo")}>
          <p>{t("privacy.locale.diritti.testo")}</p>
          <p>{t("privacy.locale.diritti.limiti")}</p>
          <p>
            {t("privacy.locale.diritti.reclamo.a")}{" "}
            <strong>{t("privacy.garante")}</strong>{" "}
            {t("privacy.locale.diritti.reclamo.b")}
          </p>
        </Sezione>

        <Sezione titolo={t("privacy.locale.conferimento.titolo")}>
          <p>{t("privacy.locale.conferimento.testo")}</p>
        </Sezione>

        <p className="pt-4 text-muted">{t("legale.aggiornamento")}</p>
      </main>
    </LinguaProvider>
  );
}
