import type { Metadata } from "next";
import { LinguaProvider } from "@repo/shared/i18n/contesto";
import { linguaPagina } from "@/lib/lingua";
import { tLegale } from "@/i18n/legale";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang } = await searchParams;
  const t = tLegale(await linguaPagina(lang));
  return {
    title: t("cookie.titolo"),
    robots: { index: false, follow: true },
  };
}

/**
 * Informativa cookie.
 *
 * Dice una cosa sola, ed è vera: non c'è nulla che richieda consenso.
 * Nessuna analitica, nessun pixel, nessun cookie di terze parti a fini
 * pubblicitari — verificato nel codice, non presunto. Per questo non c'è
 * banner: mostrarne uno dove non serve abitua le persone a cliccare
 * "accetta" senza leggere, e non rende nessuno più conforme.
 *
 * Se un giorno si aggiunge uno strumento di analisi, questa pagina va
 * riscritta e va introdotto un banner con consenso preventivo.
 */
export default async function CookiePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const lingua = await linguaPagina(lang);
  const t = tLegale(lingua);

  return (
    <LinguaProvider lingua={lingua}>
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 text-sm leading-relaxed">
        <h1 className="text-2xl font-semibold tracking-tight">{t("cookie.titolo")}</h1>

        {/* L'italiano è il testo che fa fede: chi legge l'inglese deve saperlo
            prima di leggere il resto, non in fondo. */}
        {t.lingua === "en" && (
          <p className="text-muted">{t("legale.prevalenza")}</p>
        )}

        <p>
          {t("cookie.intro.a")} <strong>{t("cookie.intro.forte")}</strong>
          {t("cookie.intro.b")}
        </p>

        <h2 className="pt-3 font-semibold">{t("cookie.salvato.titolo")}</h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">{t("cookie.tabella.nome")}</th>
                <th className="py-2 pr-3 font-medium">{t("cookie.tabella.chi")}</th>
                <th className="py-2 pr-3 font-medium">{t("cookie.tabella.scopo")}</th>
                <th className="py-2 font-medium">{t("cookie.tabella.durata")}</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-border/70">
                <td className="py-2 pr-3">
                  <code>__stripe_mid</code>, <code>__stripe_sid</code>
                </td>
                <td className="py-2 pr-3">{t("cookie.stripe.chi")}</td>
                <td className="py-2 pr-3">{t("cookie.stripe.scopo")}</td>
                <td className="py-2">{t("cookie.stripe.durata")}</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">
                  <code>__Secure-authjs.session-token</code>
                </td>
                <td className="py-2 pr-3">{t("cookie.sessione.chi")}</td>
                <td className="py-2 pr-3">{t("cookie.sessione.scopo")}</td>
                <td className="py-2">{t("cookie.sessione.durata")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          {t("cookie.tecnici.a")} <strong>{t("cookie.tecnici.forte")}</strong>
          {t("cookie.tecnici.b")}
        </p>

        <h2 className="pt-3 font-semibold">{t("cookie.memoria.titolo")}</h2>
        <p>
          {t("cookie.memoria.a")} <code>localStorage</code>,{" "}
          <code>sessionStorage</code> {t("cookie.memoria.b")}
        </p>

        <h2 className="pt-3 font-semibold">{t("cookie.rimuovere.titolo")}</h2>
        <p>{t("cookie.rimuovere.testo")}</p>

        <h2 className="pt-3 font-semibold">{t("cookie.cambia.titolo")}</h2>
        <p>
          {t("cookie.cambia.a")} <em>{t("cookie.cambia.enfasi")}</em>{" "}
          {t("cookie.cambia.b")}
        </p>

        <p className="pt-4 text-muted">{t("legale.aggiornamento")}</p>
      </main>
    </LinguaProvider>
  );
}
