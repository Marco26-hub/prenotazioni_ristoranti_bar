import Link from "next/link";
import { auth } from "@/auth";
import { LiveBoard } from "./live-board";
import { moduloAttivo } from "@/lib/authz";
import { ModuloNonAttivo } from "../modulo-non-attivo";

export default async function OrdersPage() {
  const session = await auth();
  const venue = session?.venues[0];

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
        <h1 className="text-lg font-semibold">Ordini in corso</h1>
        <p className="mt-3 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          Il tuo utente non è associato a nessun locale. Chiedi al titolare di
          aggiungerti al personale.
        </p>
      </main>
    );
  }

  const ruolo = venue.role;

  // Il modulo si verifica qui e non solo nel menu: chi digita l'indirizzo
  // la pagina la otterrebbe lo stesso.
  if (!(await moduloAttivo(venue.venueId, "ordini"))) {
    return <ModuloNonAttivo modulo="ordini" />;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Ordini in corso</h1>
        <Link href="/dashboard/orders/stampa" className="text-sm underline">
          Stampa comande
        </Link>
      </div>
      <LiveBoard ruolo={ruolo} />
    </main>
  );
}
