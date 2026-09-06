import Link from "next/link";
import { LinguaProvider } from "@repo/shared/i18n/contesto";
import { linguaPagina } from "@/lib/lingua";
import { tLegale } from "@/i18n/legale";
/**
 * Questa pagina si raggiunge solo digitando il dominio a mano: il percorso
 * normale è la scansione del QR sul tavolo, che porta direttamente a
 * /v/{locale}/t/{tavolo}. Serve quindi solo a spiegare cosa fare.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const lingua = await linguaPagina(lang);
  const t = tLegale(lingua);

  return (
    <LinguaProvider lingua={lingua}>
      <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <div
          aria-hidden
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-3xl text-accent-foreground"
        >
          ▦
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{t("home.titolo")}</h1>

        <p className="mt-3 text-muted">{t("home.istruzioni")}</p>

        <div className="mt-10 flex gap-4 text-xs text-muted">
          <Link href="/privacy" className="underline underline-offset-2">
            {t("nav.privacy")}
          </Link>
          <Link href="/termini" className="underline underline-offset-2">
            {t("nav.termini")}
          </Link>
          <Link href="/cookie" className="underline underline-offset-2">
            {t("nav.cookie")}
          </Link>
        </div>
      </main>
    </LinguaProvider>
  );
}
