import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PLANS, TRIAL_DAYS, formatPriceCents } from "@repo/shared";

/**
 * Pagina commerciale per il ristoratore.
 *
 * Chi ha già una sessione non ha motivo di leggerla: va dritto in
 * gestionale. Descrive solo funzioni che esistono davvero — promettere qui
 * cose non implementate si paga alla prima demo.
 */

export const metadata: Metadata = {
  title: "Ordini e pagamenti al tavolo per ristoranti e bar",
  description:
    "Menu QR, ordine e pagamento al tavolo, conto alla romana, prenotazioni online e fattura elettronica. Con il marchio del tuo locale e senza commissioni sui tuoi incassi.",
  alternates: { canonical: "/" },
};

const COME_FUNZIONA = [
  {
    titolo: "Il cliente inquadra il QR",
    testo:
      "Si apre il menu del locale sul suo telefono, con foto, ingredienti e allergeni. Nessuna app da scaricare.",
  },
  {
    titolo: "Ordina dal tavolo",
    testo:
      "Sceglie i piatti, aggiunge le note per la cucina, invia. L'ordine compare subito in gestionale.",
  },
  {
    titolo: "Paga quando vuole",
    testo:
      "Carta, Apple Pay, Google Pay o Satispay. Può dividere il conto per piatto o pagare tutto lui, e lasciare la mancia.",
  },
  {
    titolo: "Il tavolo si libera",
    testo:
      "Conto saldato, sessione chiusa. Nessuno aspetta il POS, e chi vuole la fattura la chiede dal telefono.",
  },
];

const FUNZIONI = [
  {
    titolo: "Menu sempre aggiornato",
    testo:
      "Aggiungi, modifica, riordina e nascondi i piatti in tempo reale. Finito il branzino, lo togli e sparisce da tutti i tavoli.",
  },
  {
    titolo: "Allergeni a norma",
    testo:
      "Ogni piatto ha il suo campo allergeni, come richiede il Reg. UE 1169/2011. Il cliente li legge da solo, senza chiedere.",
  },
  {
    titolo: "Conto alla romana",
    testo:
      "Ognuno paga i propri piatti dal proprio telefono. Il conto si chiude da sé quando è tutto saldato.",
  },
  {
    titolo: "Prenotazioni online",
    testo:
      "Una pagina di prenotazione da mettere sul tuo sito e sui social. Le richieste arrivano direttamente in gestionale.",
  },
  {
    titolo: "Il tuo marchio",
    testo:
      "Logo, colori e dati del locale su tutte le pagine che vede il cliente. Non compare il nostro nome.",
  },
  {
    titolo: "Fattura elettronica",
    testo:
      "Il cliente inserisce i dati dal tavolo e la fattura parte allo SDI. Serve un intermediario accreditato, che colleghi tu.",
  },
  {
    titolo: "Menu trovabile su Google",
    testo:
      "Il menu ha una pagina pubblica con dati strutturati: è quello che motori di ricerca e assistenti AI leggono e citano.",
  },
  {
    titolo: "Accessi separati",
    testo:
      "Titolare, responsabile, sala e cucina vedono solo quello che serve. Chi è in sala non tocca incassi e dati fiscali.",
  },
  {
    titolo: "Importazione del menu",
    testo:
      "Carichi il menu da CSV o TSV, oppure lo importi dalla cassa Tilby se la usi. Non si ribatte tutto a mano.",
  },
];

const CONFRONTO = [
  ["Canone", "39 €/mese", "29–99 €/mese"],
  ["Costo di attivazione", "Nessuno", "Fino a 500 €"],
  ["Commissione sui tuoi incassi", "Nessuna", "Spesso 1,9–2%"],
  ["Il tuo marchio sulle pagine cliente", "Incluso", "Raro, o a pagamento"],
  ["Fattura elettronica dal tavolo", "Inclusa", "Quasi mai"],
];

function Sezione({
  titolo,
  children,
}: {
  titolo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-12">
      <h2 className="mb-6 text-xl font-semibold tracking-tight">{titolo}</h2>
      {children}
    </section>
  );
}

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const mensile = PLANS.find((p) => p.interval === "month");
  const annuale = PLANS.find((p) => p.interval === "year");

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <section className="py-14 text-center">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          I tuoi clienti ordinano e pagano dal tavolo.
          <br className="hidden sm:block" /> Tu servi, non rincorri il POS.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          Menu QR, ordine, pagamento e prenotazioni per ristoranti e bar. Con il
          marchio del tuo locale, senza commissioni sui tuoi incassi.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/registrati"
            className="flex min-h-12 items-center rounded-full bg-accent px-6 font-medium text-accent-foreground active:scale-95"
          >
            Provalo {TRIAL_DAYS} giorni gratis
          </Link>
          <a
            href="https://ristoranti-guest.vercel.app/m/trattoria-da-luca"
            className="flex min-h-12 items-center rounded-full border border-border px-6 font-medium"
          >
            Guarda un menu vero
          </a>
        </div>

        <p className="mt-4 text-sm text-muted">
          Nessuna carta richiesta per la prova. Nessun costo di attivazione.
        </p>
      </section>

      <Sezione titolo="Come funziona">
        <ol className="space-y-4">
          {COME_FUNZIONA.map((p, i) => (
            <li key={p.titolo} className="flex gap-4">
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
              >
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{p.titolo}</p>
                <p className="text-muted">{p.testo}</p>
              </div>
            </li>
          ))}
        </ol>
      </Sezione>

      <Sezione titolo="Cosa c'è dentro">
        <ul className="grid gap-4 sm:grid-cols-2">
          {FUNZIONI.map((f) => (
            <li key={f.titolo} className="rounded-xl border border-border bg-surface p-4">
              <p className="font-medium">{f.titolo}</p>
              <p className="mt-1 text-sm text-muted">{f.testo}</p>
            </li>
          ))}
        </ul>
      </Sezione>

      <Sezione titolo="Quanto costa">
        <div className="grid gap-4 sm:grid-cols-2">
          {[mensile, annuale].map(
            (plan) =>
              plan && (
                <div key={plan.key} className="rounded-xl border border-border bg-surface p-5">
                  <p className="text-sm text-muted">{plan.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatPriceCents(plan.amountCents, "EUR")}
                    <span className="text-base font-normal text-muted"> {plan.cadence}</span>
                  </p>
                  {plan.note && <p className="mt-1 text-sm text-muted">{plan.note}</p>}
                </div>
              )
          )}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-medium" />
                <th className="py-2 pr-4 font-medium">Noi</th>
                <th className="py-2 font-medium text-muted">Gli altri in Italia</th>
              </tr>
            </thead>
            <tbody>
              {CONFRONTO.map(([voce, noi, altri]) => (
                <tr key={voce} className="border-b border-border">
                  <td className="py-2 pr-4">{voce}</td>
                  <td className="py-2 pr-4 font-medium">{noi}</td>
                  <td className="py-2 text-muted">{altri}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-muted">
          Prezzi IVA esclusa. Le commissioni sulle carte sono quelle di Stripe e
          vanno dal cliente direttamente a te: non passano da noi. La colonna di
          destra riporta i listini pubblici dei concorrenti italiani a settembre
          2026; molti non pubblicano i propri prezzi.
        </p>
      </Sezione>

      <Sezione titolo="Cosa serve per partire">
        <ul className="space-y-2 text-muted">
          <li>— Un account Stripe del locale, per incassare. La verifica è di Stripe.</li>
          <li>— I dati del locale: indirizzo, telefono, partita IVA.</li>
          <li>— Il menu, che puoi caricare da file o riscrivere in gestionale.</li>
          <li>— Una stampa dei QR, uno per tavolo, che generi tu dal gestionale.</li>
        </ul>
        <p className="mt-4 text-muted">
          Per la fattura elettronica serve in più un intermediario SDI accreditato;
          per il collegamento alla cassa Tilby, l&apos;adesione al loro programma
          per sviluppatori.
        </p>
      </Sezione>

      <section className="border-t border-border py-12 text-center">
        <h2 className="text-xl font-semibold tracking-tight">
          Provalo sul tuo menu, non sul nostro
        </h2>
        <p className="mx-auto mt-2 max-w-md text-muted">
          {TRIAL_DAYS} giorni per caricare i tuoi piatti, stampare i QR e far
          provare il servizio a un tavolo vero.
        </p>
        <Link
          href="/registrati"
          className="mt-6 inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-medium text-accent-foreground active:scale-95"
        >
          Comincia la prova
        </Link>
        <p className="mt-4 text-sm text-muted">
          Hai già un account?{" "}
          <Link href="/login" className="underline underline-offset-2">
            Accedi
          </Link>
        </p>
      </section>
    </main>
  );
}
