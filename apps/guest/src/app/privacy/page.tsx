import type { Metadata } from "next";
import Link from "next/link";
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
    title: t("privacy.titolo"),
    robots: { index: false, follow: true },
  };
}

/**
 * Informativa generica, raggiungibile solo digitando il dominio a mano.
 *
 * Non prova a fare da informativa vera: il titolare del trattamento è il
 * singolo locale, e un documento che non lo nomina non soddisfa
 * l'art. 13.1.a. Qui si dice come arrivare a quella giusta.
 */
export default async function PrivacyPage({
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
        <h1 className="text-2xl font-semibold tracking-tight">{t("privacy.titolo")}</h1>

        {/* L'italiano è il testo che fa fede: chi legge l'inglese deve saperlo
            prima di leggere il resto, non in fondo. */}
        {t.lingua === "en" && (
          <p className="text-muted">{t("legale.prevalenza")}</p>
        )}

        <p>
          {t("privacy.intro.a")} <strong>{t("privacy.intro.forte")}</strong>{" "}
          {t("privacy.intro.b")}
        </p>

        <h2 className="pt-3 font-semibold">{t("privacy.trovare.titolo")}</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            {t("privacy.trovare.tavolo")} <em>{t("nav.privacy")}</em>.
          </li>
          <li>
            {t("privacy.trovare.indirizzo.a")} <code>/privacy/</code>{" "}
            {t("privacy.trovare.indirizzo.b")}
          </li>
        </ul>

        <h2 className="pt-3 font-semibold">{t("privacy.piattaforma.titolo")}</h2>
        <p>{t("privacy.piattaforma.testo")}</p>

        <h2 className="pt-3 font-semibold">{t("privacy.cookie.titolo")}</h2>
        <p>
          {t("privacy.cookie.a")}{" "}
          <Link href="/cookie" className="underline underline-offset-2">
            {t("cookie.link")}
          </Link>
          {t("privacy.cookie.b")}
        </p>

        <h2 className="pt-3 font-semibold">{t("privacy.reclami.titolo")}</h2>
        <p>
          {t("privacy.reclami.a")} <strong>{t("privacy.garante")}</strong>
          {t("privacy.reclami.b")}
        </p>

        <p className="pt-4 text-muted">{t("legale.aggiornamento")}</p>
      </main>
    </LinguaProvider>
  );
}
