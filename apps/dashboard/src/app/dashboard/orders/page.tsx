import Link from "next/link";
import { auth } from "@/auth";
import { LiveBoard } from "./live-board";
import { moduloAttivo } from "@/lib/authz";
import { repartiDelLocale } from "@/lib/reparti-locale";
import { ModuloNonAttivo } from "../modulo-non-attivo";
import { linguaUtente } from "@/lib/lingua";
import { LinguaProvider } from "@repo/shared/i18n/contesto";
import { tServizio } from "@/i18n/servizio";

export default async function OrdersPage() {
  const session = await auth();
  const venue = session?.venues[0];
  const lingua = await linguaUtente();
  const t = tServizio(lingua);

  /*
   * Senza un locale non si apre niente.
   *
   * Prima il ruolo ripiegava su "cameriere" e la verifica del modulo era
   * dentro un `if (venue && ...)`: chi non è associato a nessun locale — un
   * account appena creato, uno rimosso dal personale — otteneva la board
   * saltando il controllo dell'abbonamento, con i permessi di un cameriere
   * che nessuno gli aveva dato. Non vedeva comande di altri, perché l'API
   * filtra sulla sessione, ma la pagina non doveva aprirsi affatto.
   */
  if (!venue) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-5">
        <h1 className="text-lg font-semibold">{t("comande.titolo")}</h1>
        <p className="mt-3 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          {t("comande.senza_locale")}
        </p>
      </main>
    );
  }

  const ruolo = venue.role;

  // I nomi delle postazioni sono del locale, non del programma.
  const reparti = await repartiDelLocale(venue.venueId);

  // Il modulo si verifica qui e non solo nel menu: chi digita l'indirizzo
  // la pagina la otterrebbe lo stesso.
  if (!(await moduloAttivo(venue.venueId, "ordini"))) {
    return <ModuloNonAttivo modulo="ordini" />;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("comande.titolo")}</h1>
        <Link href="/dashboard/orders/stampa" className="text-sm underline">
          {t("comande.stampa")}
        </Link>
      </div>
      {/* Il provider vive nel layout; qui si rimette perché la board deve
          trovare una lingua anche se questo albero ne è fuori. */}
      <LinguaProvider lingua={lingua}>
        <LiveBoard ruolo={ruolo} reparti={reparti} />
      </LinguaProvider>
    </main>
  );
}
