/**
 * Questa pagina si raggiunge solo digitando il dominio a mano: il percorso
 * normale è la scansione del QR sul tavolo, che porta direttamente a
 * /v/{locale}/t/{tavolo}. Serve quindi solo a spiegare cosa fare.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div
        aria-hidden
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-3xl text-accent-foreground"
      >
        ▦
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Ordina dal tavolo</h1>

      <p className="mt-3 text-muted">
        Inquadra il QR code sul tuo tavolo per aprire il menu, ordinare e pagare
        dal telefono.
      </p>

      <div className="mt-10 flex gap-4 text-xs text-muted">
        <a href="/privacy" className="underline underline-offset-2">
          Privacy
        </a>
        <a href="/termini" className="underline underline-offset-2">
          Termini
        </a>
      </div>
    </main>
  );
}
