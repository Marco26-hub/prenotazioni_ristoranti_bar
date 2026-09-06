import Link from "next/link";
import { tGuscio } from "@/i18n/guscio";
import { linguaUtente } from "@/lib/lingua";

/**
 * Quello che si vede al posto di una pagina di un modulo non pagato.
 *
 * Non un errore: chi ci arriva è un cliente, non un intruso. Dice cosa manca
 * e dove si attiva, invece di lasciare una pagina bianca da cui si esce solo
 * col tasto indietro.
 */
export async function ModuloNonAttivo({ modulo }: { modulo: "ordini" | "prenotazioni" }) {
  const t = tGuscio(await linguaUtente());
  const nome = modulo === "ordini" ? t("modulo.ordini") : t("modulo.prenotazioni");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-lg font-semibold">{t("modulo.titolo", { nome })}</h1>
      <p className="mt-2 text-muted">
        {t("modulo.testo.prima")} <strong>{nome}</strong>
        {t("modulo.testo.dopo")}
      </p>
      <Link
        href="/dashboard/billing"
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground"
      >
        {t("modulo.abbonamento")}
      </Link>
    </main>
  );
}
