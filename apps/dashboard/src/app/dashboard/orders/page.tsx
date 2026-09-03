import Link from "next/link";
import { auth } from "@/auth";
import { LiveBoard } from "./live-board";
import { moduloAttivo } from "@/lib/authz";
import { ModuloNonAttivo } from "../modulo-non-attivo";

export default async function OrdersPage() {
  const session = await auth();
  const venue = session?.venues[0];
  const ruolo = venue?.role ?? "waiter";

  // Il modulo si verifica qui e non solo nel menu: chi digita l'indirizzo
  // la pagina la otterrebbe lo stesso.
  if (venue && !(await moduloAttivo(venue.venueId, "ordini"))) {
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
