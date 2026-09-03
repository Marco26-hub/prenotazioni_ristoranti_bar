import Link from "next/link";

/**
 * Quello che si vede al posto di una pagina di un modulo non pagato.
 *
 * Non un errore: chi ci arriva è un cliente, non un intruso. Dice cosa manca
 * e dove si attiva, invece di lasciare una pagina bianca da cui si esce solo
 * col tasto indietro.
 */
export function ModuloNonAttivo({ modulo }: { modulo: "ordini" | "prenotazioni" }) {
  const nome =
    modulo === "ordini" ? "Ordini e pagamenti" : "Prenotazioni";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-lg font-semibold">{nome} non è attivo</h1>
      <p className="mt-2 text-muted">
        Questa parte del gestionale fa parte del modulo <strong>{nome}</strong>,
        che il tuo abbonamento non comprende — o non è più attivo.
      </p>
      <Link
        href="/dashboard/billing"
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground"
      >
        Vedi l&apos;abbonamento
      </Link>
    </main>
  );
}
