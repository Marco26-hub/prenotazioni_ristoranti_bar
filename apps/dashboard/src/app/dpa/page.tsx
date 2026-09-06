import type { Metadata } from "next";
import Link from "next/link";
import { DPA_VERSION, SOTTO_RESPONSABILI } from "@/lib/dpa";
import { linguaUtente } from "@/lib/lingua";
import { tAnalisi } from "@/i18n/analisi";

export async function generateMetadata(): Promise<Metadata> {
  const t = tAnalisi(await linguaUtente());
  return {
    title: t("dpa.meta.titolo"),
    robots: { index: false, follow: true },
  };
}

function Art({ n, titolo, children }: { n: string; titolo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border pt-4">
      <h2 className="font-semibold">
        {n}. {titolo}
      </h2>
      {children}
    </section>
  );
}

/**
 * Accordo art. 28 GDPR fra il locale (titolare) e il fornitore della
 * piattaforma (responsabile).
 *
 * Il testo è pubblico e versionato: il locale deve poterlo leggere prima di
 * accettarlo, e deve poter tornare a leggere esattamente la versione che ha
 * accettato.
 *
 * L'inglese serve a capire, non a firmare: quello che il locale accetta è
 * l'italiano, e la riga in cima lo dichiara. Un accordo art. 28 tradotto e
 * fatto passare per l'originale è un accordo che a un contenzioso non regge.
 */
export default async function DpaPage() {
  const t = tAnalisi(await linguaUtente());

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-8 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold tracking-tight">{t("dpa.titolo")}</h1>
      <p className="text-xs text-muted">{t("dpa.nota_lingua")}</p>
      <p className="text-muted">{t("dpa.versione", { versione: DPA_VERSION })}</p>

      <p>
        {t("dpa.premessa.a")}
        <strong>{t("dpa.premessa.forte")}</strong>
        {t("dpa.premessa.b")}
      </p>

      <Art n="1" titolo={t("dpa.art1.titolo")}>
        <p>
          <strong>{t("dpa.art1.titolare.etichetta")}</strong>
          {t("dpa.art1.titolare.testo")}
        </p>
        <p>
          <strong>{t("dpa.art1.responsabile.etichetta")}</strong>
          {t("dpa.art1.responsabile.testo")}
        </p>
      </Art>

      <Art n="2" titolo={t("dpa.art2.titolo")}>
        <p>{t("dpa.art2.testo")}</p>
      </Art>

      <Art n="3" titolo={t("dpa.art3.titolo")}>
        <p>
          <strong>{t("dpa.art3.interessati.etichetta")}</strong>
          {t("dpa.art3.interessati.testo")}
        </p>
        <p>
          <strong>{t("dpa.art3.dati.etichetta")}</strong>
          {t("dpa.art3.dati.testo")}
        </p>
        <p>
          {t("dpa.art3.particolari.a")}
          <strong>{t("dpa.art3.particolari.forte")}</strong>
          {t("dpa.art3.particolari.b")}
        </p>
      </Art>

      <Art n="4" titolo={t("dpa.art4.titolo")}>
        <p>{t("dpa.art4.testo")}</p>
        <p>
          {t("dpa.art4.propri.a")}
          <strong>{t("dpa.art4.propri.forte")}</strong>
          {t("dpa.art4.propri.b")}
        </p>
      </Art>

      <Art n="5" titolo={t("dpa.art5.titolo")}>
        <p>{t("dpa.art5.testo")}</p>
      </Art>

      <Art n="6" titolo={t("dpa.art6.titolo")}>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("dpa.art6.https")}</li>
          <li>{t("dpa.art6.password")}</li>
          <li>{t("dpa.art6.segreti")}</li>
          <li>{t("dpa.art6.ruoli")}</li>
          <li>{t("dpa.art6.isolamento")}</li>
          <li>{t("dpa.art6.ip")}</li>
          <li>{t("dpa.art6.carte")}</li>
          <li>{t("dpa.art6.backup")}</li>
        </ul>
      </Art>

      <Art n="7" titolo={t("dpa.art7.titolo")}>
        <p>
          {t("dpa.art7.a")}
          <strong>{t("dpa.art7.forte")}</strong>
          {t("dpa.art7.b")}
        </p>
        <p className="text-muted">{t("dpa.art7.nota")}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">{t("dpa.art7.col.fornitore")}</th>
                <th className="py-2 pr-3 font-medium">{t("dpa.art7.col.attivita")}</th>
                <th className="py-2 font-medium">{t("dpa.art7.col.dove")}</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {SOTTO_RESPONSABILI.map((s) => (
                <tr key={s.nome} className="border-b border-border/70">
                  <td className="py-2 pr-3">{s.nome}</td>
                  <td className="py-2 pr-3">
                    {t(s.attivita as Parameters<typeof t>[0])}
                  </td>
                  <td className="py-2">{t(s.dove as Parameters<typeof t>[0])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted">
          {t("dpa.art7.pagamenti.a")}
          <em>{t("dpa.art7.pagamenti.em")}</em>
          {t("dpa.art7.pagamenti.b")}
        </p>
      </Art>

      <Art n="8" titolo={t("dpa.art8.titolo")}>
        <p>{t("dpa.art8.testo")}</p>
      </Art>

      <Art n="9" titolo={t("dpa.art9.titolo")}>
        <p>{t("dpa.art9.testo")}</p>
      </Art>

      <Art n="10" titolo={t("dpa.art10.titolo")}>
        <p>
          {t("dpa.art10.a")}
          <strong>{t("dpa.art10.forte")}</strong>
          {t("dpa.art10.b")}
        </p>
      </Art>

      <Art n="11" titolo={t("dpa.art11.titolo")}>
        <p>
          {t("dpa.art11.a")}
          <strong>{t("dpa.art11.forte")}</strong>
          {t("dpa.art11.b")}
        </p>
      </Art>

      <Art n="12" titolo={t("dpa.art12.titolo")}>
        <p>{t("dpa.art12.testo")}</p>
      </Art>

      <Art n="13" titolo={t("dpa.art13.titolo")}>
        <p>{t("dpa.art13.testo")}</p>
      </Art>

      <p className="border-t border-border pt-4 text-muted">{t("dpa.chiusura")}</p>

      <p>
        <Link href="/dashboard" className="underline underline-offset-2">
          {t("dpa.torna")}
        </Link>
      </p>
    </main>
  );
}
