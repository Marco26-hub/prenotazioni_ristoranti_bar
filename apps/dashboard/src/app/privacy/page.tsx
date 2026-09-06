import type { Metadata } from "next";
import Link from "next/link";
import { SOTTO_RESPONSABILI } from "@/lib/dpa";
import { linguaUtente } from "@/lib/lingua";
import { tAnalisi } from "@/i18n/analisi";

export async function generateMetadata(): Promise<Metadata> {
  const t = tAnalisi(await linguaUtente());
  return {
    title: t("privacy.meta.titolo"),
    robots: { index: false, follow: true },
  };
}

/**
 * Informativa verso il ristoratore.
 *
 * Qui i ruoli si invertono rispetto alla /privacy dell'app cliente: per i
 * dati dell'account — email, password, fatturazione dell'abbonamento — il
 * titolare siamo noi, non il locale. Tenerle separate evita l'errore
 * comune di un unico documento che confonde i due rapporti.
 *
 * L'inglese è una traduzione di cortesia: il testo che vincola è l'italiano,
 * e la riga in cima lo dice prima che qualcuno ci costruisca sopra.
 */
function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border pt-4">
      <h2 className="font-semibold">{titolo}</h2>
      {children}
    </section>
  );
}

export default async function PrivacyGestionalePage() {
  const t = tAnalisi(await linguaUtente());

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-8 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("privacy.titolo")}
      </h1>

      <p className="text-xs text-muted">{t("privacy.nota_lingua")}</p>

      <p className="text-muted">
        {t("privacy.premessa.a")}
        <strong>{t("privacy.premessa.forte")}</strong>
        {t("privacy.premessa.b")}
        <em>{t("privacy.premessa.em")}</em>
        {t("privacy.premessa.c")}
        <Link href="/dpa" className="underline underline-offset-2">
          {t("privacy.premessa.link")}
        </Link>
        {t("privacy.premessa.d")}
      </p>

      <Sezione titolo={t("privacy.titolare.titolo")}>
        <p>{t("privacy.titolare.testo")}</p>
      </Sezione>

      <Sezione titolo={t("privacy.dati.titolo")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">{t("privacy.dati.col.dati")}</th>
                <th className="py-2 pr-3 font-medium">
                  {t("privacy.dati.col.finalita")}
                </th>
                <th className="py-2 pr-3 font-medium">{t("privacy.dati.col.base")}</th>
                <th className="py-2 font-medium">
                  {t("privacy.dati.col.conservazione")}
                </th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-border/70">
                <td className="py-2 pr-3">{t("privacy.dati.accesso.dati")}</td>
                <td className="py-2 pr-3">{t("privacy.dati.accesso.finalita")}</td>
                <td className="py-2 pr-3">{t("privacy.dati.accesso.base")}</td>
                <td className="py-2">{t("privacy.dati.accesso.conservazione")}</td>
              </tr>
              <tr className="border-b border-border/70">
                <td className="py-2 pr-3">{t("privacy.dati.fatturazione.dati")}</td>
                <td className="py-2 pr-3">
                  {t("privacy.dati.fatturazione.finalita")}
                </td>
                <td className="py-2 pr-3">{t("privacy.dati.fatturazione.base")}</td>
                <td className="py-2">
                  {t("privacy.dati.fatturazione.conservazione")}
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-3">{t("privacy.dati.ip.dati")}</td>
                <td className="py-2 pr-3">{t("privacy.dati.ip.finalita")}</td>
                <td className="py-2 pr-3">{t("privacy.dati.ip.base")}</td>
                <td className="py-2">{t("privacy.dati.ip.conservazione")}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>{t("privacy.dati.carta")}</p>
      </Sezione>

      <Sezione titolo={t("privacy.fornitori.titolo")}>
        <ul className="list-disc space-y-1 pl-5">
          {SOTTO_RESPONSABILI.map((s) => (
            <li key={s.nome}>
              <strong>{s.nome}</strong> —{" "}
              {t(s.attivita as Parameters<typeof t>[0])} (
              {t(s.dove as Parameters<typeof t>[0])}).
            </li>
          ))}
          <li>
            <strong>{t("privacy.fornitori.stripe.nome")}</strong>
            {t("privacy.fornitori.stripe.testo")}
          </li>
        </ul>
        <p>{t("privacy.fornitori.nota")}</p>
      </Sezione>

      <Sezione titolo={t("privacy.diritti.titolo")}>
        <p>
          {t("privacy.diritti.a")}
          <strong>{t("privacy.diritti.garante")}</strong>
          {t("privacy.diritti.b")}
        </p>
        <p>{t("privacy.diritti.fiscali")}</p>
      </Sezione>

      <Sezione titolo={t("privacy.cookie.titolo")}>
        <p>{t("privacy.cookie.testo")}</p>
      </Sezione>

      <p className="pt-4 text-muted">{t("privacy.aggiornamento")}</p>
    </main>
  );
}
