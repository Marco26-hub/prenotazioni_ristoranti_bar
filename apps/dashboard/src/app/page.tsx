import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PLANS, setupCents, TRIAL_DAYS, formatPriceCents } from "@repo/shared";
import { MockupTelefono } from "./mockup-telefono";

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
    "Menu QR, ordine e pagamento al tavolo, conto alla romana, prenotazioni online e fattura elettronica. Con il marchio del tuo locale, e senza percentuali trattenute da noi sui tuoi incassi.",
  alternates: { canonical: "/" },
};

const NASTRO = [
  "Menu QR",
  "Ordine al tavolo",
  "Conto alla romana",
  "Apple Pay",
  "Satispay",
  "Prenotazioni online",
  "Fattura elettronica",
  "Allergeni a norma",
  "Il tuo marchio",
  "Nessuna percentuale trattenuta",
];

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

/** `ampio` marca le celle che occupano due colonne nella griglia bento. */
const FUNZIONI = [
  {
    titolo: "Menu sempre aggiornato",
    testo:
      "Aggiungi, modifica, riordina e nascondi i piatti in tempo reale. Finito il branzino, lo togli e sparisce da tutti i tavoli nello stesso istante.",
    ampio: true,
  },
  {
    titolo: "Allergeni a norma",
    testo:
      "Campo dedicato su ogni piatto, come richiede il Reg. UE 1169/2011. Il cliente li legge da solo.",
  },
  {
    titolo: "Conto alla romana",
    testo:
      "Ognuno paga i propri piatti dal proprio telefono. Il conto si chiude da sé quando è tutto saldato.",
  },
  {
    titolo: "Prenotazioni online",
    testo:
      "Una pagina da mettere sul tuo sito e sui social. Le richieste arrivano dritte in gestionale.",
  },
  {
    titolo: "Il tuo marchio",
    testo:
      "Logo, colori e dati del locale su ogni pagina che vede il cliente. Il nostro nome non compare mai.",
    ampio: true,
  },
  {
    titolo: "Fattura elettronica",
    testo:
      "Il cliente inserisce i dati dal tavolo e la fattura parte allo SDI, tramite un intermediario che colleghi tu.",
  },
  {
    titolo: "Trovabile su Google e dalle AI",
    testo:
      "Il menu ha una pagina pubblica con dati strutturati: è quello che motori di ricerca e assistenti leggono e citano.",
  },
  {
    titolo: "Accessi separati",
    testo:
      "Titolare, responsabile, sala e cucina vedono solo il proprio. Chi è in sala non tocca incassi e dati fiscali.",
  },
  {
    titolo: "Importazione del menu",
    testo: "Da file CSV o TSV, oppure dalla cassa Tilby. Non si ribatte tutto a mano.",
  },
];

const CONFRONTO: Array<[string, string, string]> = [
  ["Canone", "da 89 €/mese", "29–249 €/mese"],
  ["Costo di attivazione", "449–649 €", "0–600 €"],
  ["Percentuale che tratteniamo noi", "Nessuna", "1,2–2% dell'incassato"],
  ["Il tuo marchio sulle pagine cliente", "Incluso", "Raro, o a pagamento"],
  ["Fattura elettronica dal tavolo", "Inclusa", "Quasi mai"],
  ["Prenotazioni online incluse", "Sì", "Spesso a parte"],
  ["Scegli tu il fornitore di pagamento", "Sì", "Quasi mai"],
  ["Compri solo il modulo che ti serve", "Sì", "Quasi mai"],
];

const SERVE = [
  "Un account Stripe del locale, per incassare. La verifica è di Stripe.",
  "I dati del locale: indirizzo, telefono, partita IVA.",
  "Il menu, da caricare da file o scrivere in gestionale.",
  "Una stampa dei QR, uno per tavolo, che generi tu.",
];

function Titolo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="compare display text-3xl sm:text-4xl">
      {children}
    </h2>
  );
}

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const mensili = PLANS.filter((p) => p.interval === "month");

  return (
    <div data-landing className="relative overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-border/60 vetro">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm text-accent-foreground"
            >
              ▦
            </span>
            Tavolo
          </span>
          <div className="flex items-center gap-1">
            <Link
              href="/login"
              className="flex min-h-11 items-center rounded-full px-4 text-sm font-medium"
            >
              Accedi
            </Link>
            <Link
              href="/registrati"
              className="flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground"
            >
              Prova gratis
            </Link>
          </div>
        </nav>
      </header>

      {/* ---------------------------------------------------------------- */}
      <section className="grana relative overflow-hidden px-4 pb-16 pt-14 sm:pt-20">
        <div aria-hidden className="aurora">
          <span />
          <span />
          <span />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="vetro mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-accent"
              />
              Per ristoranti e bar in Italia
            </p>

            <h1 className="titolo-sfumato display text-[2.75rem] sm:text-7xl">
              I tuoi clienti ordinano e pagano dal tavolo.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted sm:text-xl">
              Tu servi, non rincorri il POS. Menu QR, ordine, pagamento e
              prenotazioni — con il marchio del tuo locale. Le commissioni
              della carta le paghi al tuo fornitore, non a noi.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                href="/registrati"
                className="flex min-h-12 items-center rounded-full bg-accent px-7 font-medium text-accent-foreground shadow-[0_14px_34px_-14px_var(--accent)] transition-transform active:scale-95"
              >
                Provalo {TRIAL_DAYS} giorni gratis
              </Link>
              <a
                href="https://ristoranti-guest.vercel.app/m/trattoria-da-luca"
                className="vetro flex min-h-12 items-center rounded-full px-7 font-medium"
              >
                Guarda un menu vero
              </a>
            </div>

            <p className="mt-4 text-sm text-muted">
              Nessuna carta per la prova. Paghi solo se decidi di restare.
            </p>
          </div>

          <div className="relative mt-14 sm:mt-16">
            <MockupTelefono />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <div className="nastro overflow-hidden border-y border-border py-3">
        <div className="flex w-max gap-8 whitespace-nowrap text-sm text-muted">
          {[0, 1].map((giro) => (
            // Due copie identiche: la seconda entra da destra mentre la prima
            // esce, così lo scorrimento non mostra mai uno stacco.
            <div key={giro} aria-hidden={giro === 1} className="flex gap-8">
              {NASTRO.map((v) => (
                <span key={v} className="flex items-center gap-8">
                  {v}
                  <span className="text-accent">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <Titolo>Quattro passaggi, nessuna attesa</Titolo>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2">
          {COME_FUNZIONA.map((p, i) => (
            <li
              key={p.titolo}
              className="compare scheda vetro rounded-2xl p-5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span
                aria-hidden
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-foreground"
              >
                {i + 1}
              </span>
              <p className="font-medium">{p.titolo}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{p.testo}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <Titolo>Tutto quello che serve, già dentro</Titolo>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FUNZIONI.map((f) => (
            <li
              key={f.titolo}
              className={`compare scheda vetro rounded-2xl p-5 ${
                f.ampio ? "sm:col-span-2 lg:col-span-1 xl:col-span-2" : ""
              }`}
            >
              <p className="font-medium">{f.titolo}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.testo}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <Titolo>Un prezzo solo, scritto sul sito</Titolo>
          <p className="compare mt-3 max-w-xl text-muted">
            Nessun preventivo da chiedere, nessuna percentuale nascosta sul tuo
            incassato.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {mensili.map((plan) => (
              <div
                key={plan.key}
                className={`compare rounded-2xl p-6 ${
                  plan.moduli.length > 1 ? "bordo-vivo" : "scheda vetro"
                }`}
              >
                <div
                  className={
                    plan.moduli.length > 1 ? "h-full rounded-2xl bg-surface p-5" : ""
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted">{plan.label}</p>
                    {plan.moduli.length > 1 && (
                      <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
                        Consigliato
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
                    {formatPriceCents(plan.amountCents, "EUR")}
                    <span className="text-base font-normal text-muted"> al mese</span>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {plan.descrizione}
                  </p>
                  {plan.note && (
                    <p className="mt-2 text-sm font-medium text-accent">{plan.note}</p>
                  )}
                  <p className="mt-2 text-sm text-muted">
                    + {formatPriceCents(setupCents(plan), "EUR")} di attivazione
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="compare mt-4 text-sm text-muted">
            Sull&apos;annuale due mesi sono in omaggio. L&apos;attivazione si
            paga una sola volta e vale 449 € per le sole prenotazioni, 649 €
            dove ci sono anche gli ordini: comprende menu caricato, QR pronti
            da stampare, Stripe collegato e marchio configurato. Hai già la
            tua cassa? Prendi solo quello che ti manca: i moduli si comprano
            separati.
          </p>

          <div className="compare mt-8 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4 font-medium" />
                  <th className="py-3 pr-4 font-medium">Noi</th>
                  <th className="py-3 font-medium text-muted">
                    Gli altri in Italia
                  </th>
                </tr>
              </thead>
              <tbody>
                {CONFRONTO.map(([voce, noi, altri]) => (
                  <tr key={voce} className="border-b border-border/70">
                    <td className="py-3 pr-4">{voce}</td>
                    <td className="py-3 pr-4 font-medium text-accent">{noi}</td>
                    <td className="py-3 text-muted">{altri}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="compare mt-10 space-y-3">
            <h3 className="text-lg font-medium">Come si paga davvero</h3>
            <p className="max-w-2xl text-muted">
              <strong>Noi non prendiamo nulla sui tuoi incassi.</strong> Le
              commissioni della carta le paghi al tuo fornitore di pagamento,
              non a noi, e il denaro arriva sul tuo conto senza passare da
              noi.
            </p>
            <p className="max-w-2xl text-muted">
              Chi ti offre un canone basso e una percentuale unica sta
              incassando lui e girandoti il resto. A volte quella percentuale
              conviene, soprattutto con volumi bassi. Quello che perdi è il
              rapporto diretto: non puoi negoziare la tariffa, non puoi
              cambiare fornitore senza cambiare gestionale, e il giorno che
              cresci la percentuale cresce con te.
            </p>
            <p className="max-w-2xl text-muted">
              Da noi il fornitore di pagamento è tuo. Se hai già un POS e un
              acquirer che ti fa una tariffa buona, tienili: il conto si
              chiude segnando l&apos;incasso sul tuo terminale e il tavolo si
              libera lo stesso.
            </p>
          </div>

          <p className="compare mt-6 text-sm text-muted">
            Prezzi IVA esclusa. L&apos;attivazione è una sola volta e comprende
            il menu caricato, i QR pronti da stampare, Stripe collegato e il
            marchio configurato. La colonna di destra riporta i listini
            pubblici dei concorrenti italiani a settembre 2026; molti non
            pubblicano i propri prezzi.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <Titolo>Solo prenotazioni, se è quello che ti serve</Titolo>
        <div className="compare scheda vetro mt-8 rounded-2xl p-6">
          <p className="leading-relaxed text-muted">
            Una pagina di prenotazione da mettere sul tuo sito e nei profili
            social. Il cliente sceglie giorno, ora e persone; tu ricevi la
            richiesta per email e la confermi o la rifiuti dal calendario.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <li>— Controllo capienza: se quell&apos;ora è piena, il sistema lo dice subito</li>
            <li>— Rifiutando, al cliente arrivano gli orari vicini in cui c&apos;è posto</li>
            <li>— Calendario del mese con coperti e richieste da confermare</li>
            <li>— Conferma automatica, se preferisci non rispondere a mano</li>
            <li>— Arrivi e no-show segnati, per sapere su chi contare</li>
            <li>— Funziona da sola: non serve il resto del gestionale</li>
          </ul>
          <a
            href="https://ristoranti-guest.vercel.app/p/trattoria-da-luca"
            className="mt-6 inline-flex min-h-12 items-center rounded-full border border-border px-6 font-medium"
          >
            Prova la pagina di prenotazione
          </a>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <Titolo>Cosa serve per partire</Titolo>
        <ul className="compare mt-8 grid gap-3 sm:grid-cols-2">
          {SERVE.map((v) => (
            <li key={v} className="flex gap-3 text-muted">
              <span aria-hidden className="mt-1 text-accent">
                ✓
              </span>
              {v}
            </li>
          ))}
        </ul>
        <p className="compare mt-5 text-sm text-muted">
          Per la fattura elettronica serve in più un intermediario SDI
          accreditato; per il collegamento alla cassa Tilby, l&apos;adesione al
          loro programma per sviluppatori.
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="grana relative overflow-hidden px-4 py-24 text-center">
        <div aria-hidden className="aurora" style={{ opacity: 0.35 }}>
          <span />
          <span />
          <span />
        </div>

        <div className="relative z-10 mx-auto max-w-xl">
          <h2 className="titolo-sfumato display text-4xl sm:text-5xl">
            Provalo sul tuo menu, non sul nostro
          </h2>
          <p className="mt-4 text-lg text-muted">
            {TRIAL_DAYS} giorni per caricare i tuoi piatti, stampare i QR e far
            provare il servizio a un tavolo vero.
          </p>
          <Link
            href="/registrati"
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-accent px-7 font-medium text-accent-foreground shadow-[0_14px_34px_-14px_var(--accent)] transition-transform active:scale-95"
          >
            Comincia la prova
          </Link>
          <p className="mt-4 text-sm text-muted">
            Hai già un account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Accedi
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>Ordini e pagamenti al tavolo per ristoranti e bar.</span>
          <span className="flex flex-wrap gap-x-4">
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy
            </Link>
            <Link href="/dpa" className="underline underline-offset-4">
              Trattamento dati
            </Link>
            <a
              href="https://ristoranti-guest.vercel.app/cookie"
              className="underline underline-offset-4"
            >
              Cookie
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
