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
  return { title: t("termini.titolo") };
}

export default async function TerminiPage({
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
        <h1 className="text-2xl font-semibold tracking-tight">{t("termini.titolo")}</h1>

        {/* L'italiano è il testo che fa fede: chi legge l'inglese deve saperlo
            prima di leggere il resto, non in fondo. */}
        {t.lingua === "en" && (
          <p className="text-muted">{t("legale.prevalenza")}</p>
        )}

        <p className="rounded-lg border border-accent/40 bg-accent/10 p-3">
          {t("termini.bozza")}
        </p>

        <h2 className="pt-2 font-semibold">{t("termini.oggetto.titolo")}</h2>
        <p>{t("termini.oggetto.testo")}</p>

        <h2 className="pt-2 font-semibold">{t("termini.ordini.titolo")}</h2>
        <p>{t("termini.ordini.testo")}</p>

        <h2 className="pt-2 font-semibold">{t("termini.pagamenti.titolo")}</h2>
        <p>{t("termini.pagamenti.testo")}</p>

        <h2 className="pt-2 font-semibold">{t("termini.fattura.titolo")}</h2>
        <p>{t("termini.fattura.testo")}</p>

        <h2 className="pt-2 font-semibold">{t("termini.rimborsi.titolo")}</h2>
        <p>{t("termini.rimborsi.testo")}</p>
      </main>
    </LinguaProvider>
  );
}
