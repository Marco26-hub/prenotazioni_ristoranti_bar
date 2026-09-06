import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PLANS, setupCents, TRIAL_DAYS } from "@repo/shared";
import { tGuscio } from "@/i18n/guscio";
import { linguaUtente } from "@/lib/lingua";
import { MockupTelefono } from "./mockup-telefono";

/** Le chiavi del dizionario, per gli elenchi che stanno fuori dal JSX. */
type Chiave = Parameters<ReturnType<typeof tGuscio>>[0];

const NUMERO_WHATSAPP = "393477196603";

/**
 * Pagina commerciale per il ristoratore.
 *
 * Chi ha già una sessione non ha motivo di leggerla: va dritto in
 * gestionale. Descrive solo funzioni che esistono davvero — promettere qui
 * cose non implementate si paga alla prima demo.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = tGuscio(await linguaUtente());
  return {
    title: t("vetrina.meta.titolo"),
    description: t("vetrina.meta.descrizione"),
    alternates: { canonical: "/" },
  };
}

const NASTRO: Chiave[] = [
  "vetrina.nastro.menuqr",
  "vetrina.nastro.ordine",
  "vetrina.nastro.romana",
  "vetrina.nastro.applepay",
  "vetrina.nastro.satispay",
  "vetrina.nastro.prenotazioni",
  "vetrina.nastro.fattura",
  "vetrina.nastro.allergeni",
  "vetrina.nastro.marchio",
  "vetrina.nastro.percentuale",
];

const COME_FUNZIONA: Array<{ titolo: Chiave; testo: Chiave }> = [
  { titolo: "vetrina.passo.qr.titolo", testo: "vetrina.passo.qr.testo" },
  { titolo: "vetrina.passo.ordina.titolo", testo: "vetrina.passo.ordina.testo" },
  { titolo: "vetrina.passo.paga.titolo", testo: "vetrina.passo.paga.testo" },
  { titolo: "vetrina.passo.libera.titolo", testo: "vetrina.passo.libera.testo" },
];

/** `ampio` marca le celle che occupano due colonne nella griglia bento. */
const FUNZIONI: Array<{ titolo: Chiave; testo: Chiave; ampio?: boolean }> = [
  {
    titolo: "vetrina.funzione.menu.titolo",
    testo: "vetrina.funzione.menu.testo",
    ampio: true,
  },
  {
    titolo: "vetrina.funzione.allergeni.titolo",
    testo: "vetrina.funzione.allergeni.testo",
  },
  {
    titolo: "vetrina.funzione.romana.titolo",
    testo: "vetrina.funzione.romana.testo",
  },
  {
    titolo: "vetrina.funzione.prenotazioni.titolo",
    testo: "vetrina.funzione.prenotazioni.testo",
    ampio: true,
  },
  {
    titolo: "vetrina.funzione.recensioni.titolo",
    testo: "vetrina.funzione.recensioni.testo",
  },
  {
    titolo: "vetrina.funzione.banco.titolo",
    testo: "vetrina.funzione.banco.testo",
    ampio: true,
  },
  {
    titolo: "vetrina.funzione.formula.titolo",
    testo: "vetrina.funzione.formula.testo",
  },
  {
    titolo: "vetrina.funzione.marchio.titolo",
    testo: "vetrina.funzione.marchio.testo",
    ampio: true,
  },
  {
    titolo: "vetrina.funzione.fattura.titolo",
    testo: "vetrina.funzione.fattura.testo",
  },
  {
    titolo: "vetrina.funzione.google.titolo",
    testo: "vetrina.funzione.google.testo",
  },
  {
    titolo: "vetrina.funzione.accessi.titolo",
    testo: "vetrina.funzione.accessi.testo",
  },
  {
    titolo: "vetrina.funzione.importa.titolo",
    testo: "vetrina.funzione.importa.testo",
  },
  {
    titolo: "vetrina.funzione.assistenza.titolo",
    testo: "vetrina.funzione.assistenza.testo",
  },
];

const CONFRONTO: Array<[Chiave, Chiave, Chiave]> = [
  ["confronto.canone.voce", "confronto.canone.noi", "confronto.canone.altri"],
  [
    "confronto.attivazione.voce",
    "confronto.attivazione.noi",
    "confronto.attivazione.altri",
  ],
  [
    "confronto.percentuale.voce",
    "confronto.percentuale.noi",
    "confronto.percentuale.altri",
  ],
  ["confronto.marchio.voce", "confronto.marchio.noi", "confronto.marchio.altri"],
  ["confronto.fattura.voce", "confronto.fattura.noi", "confronto.fattura.altri"],
  [
    "confronto.prenotazioni.voce",
    "confronto.prenotazioni.noi",
    "confronto.prenotazioni.altri",
  ],
  [
    "confronto.fornitore.voce",
    "confronto.fornitore.noi",
    "confronto.fornitore.altri",
  ],
  ["confronto.moduli.voce", "confronto.moduli.noi", "confronto.moduli.altri"],
  [
    "confronto.promemoria.voce",
    "confronto.promemoria.noi",
    "confronto.promemoria.altri",
  ],
  ["confronto.formula.voce", "confronto.formula.noi", "confronto.formula.altri"],
  ["confronto.banco.voce", "confronto.banco.noi", "confronto.banco.altri"],
];

const SERVE: Chiave[] = [
  "vetrina.serve.stripe",
  "vetrina.serve.dati",
  "vetrina.serve.menu",
  "vetrina.serve.qr",
];

/*
 * I piani restano in italiano in `plans.ts`, che è condiviso e serve anche a
 * Stripe: qui c'è solo la versione da mostrare, una per chiave di piano. Se
 * un piano nuovo non ha ancora la sua voce, si ripiega su quella scritta nel
 * listino — italiana, ma giusta, che è meglio di una cella vuota.
 */
const VOCE_PIANO: Record<string, { titolo: Chiave; testo: Chiave; nota: Chiave }> = {
  "ordini-mensile": {
    titolo: "piano.ordini.titolo",
    testo: "piano.ordini.testo",
    nota: "piano.ordini.nota",
  },
  "prenotazioni-mensile": {
    titolo: "piano.prenotazioni.titolo",
    testo: "piano.prenotazioni.testo",
    nota: "piano.prenotazioni.nota",
  },
  "completo-mensile": {
    titolo: "piano.completo.titolo",
    testo: "piano.completo.testo",
    nota: "piano.completo.nota",
  },
};

function Titolo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="compare display text-3xl sm:text-4xl">
      {children}
    </h2>
  );
}

export default async function LandingPage() {
  const t = tGuscio(await linguaUtente());
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const mensili = PLANS.filter((p) => p.interval === "month");

  // Il messaggio precompilato è la prima cosa che il ristoratore vede
  // arrivare da sé nella chat: scritto nella sua lingua, non nella nostra.
  const whatsappUrl = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(
    t("vetrina.whatsapp.messaggio")
  )}`;

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
              {t("vetrina.accedi")}
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground"
            >
              {t("vetrina.call")}
            </a>
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
              {t("vetrina.badge")}
            </p>

            <h1 className="titolo-sfumato display text-[2.75rem] sm:text-7xl">
              {t("vetrina.titolo")}
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted sm:text-xl">
              {t("vetrina.sottotitolo")}
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center rounded-full bg-accent px-7 font-medium text-accent-foreground shadow-[0_14px_34px_-14px_var(--accent)] transition-transform active:scale-95"
              >
                {t("vetrina.call")}
              </a>
              <a
                href="https://ristoranti-guest.vercel.app/m/trattoria-da-luca"
                className="vetro flex min-h-12 items-center rounded-full px-7 font-medium"
              >
                {t("vetrina.menu_vero")}
              </a>
            </div>

            <p className="mt-4 text-sm text-muted">
              {t("vetrina.prova.domanda")}{" "}
              <Link href="/registrati" className="font-medium text-accent underline underline-offset-4">
                {t("vetrina.prova.link", { giorni: TRIAL_DAYS })}
              </Link>
              {t("vetrina.prova.coda")}
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
                  {t(v)}
                  <span className="text-accent">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <Titolo>{t("vetrina.passi.titolo")}</Titolo>
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
              <p className="font-medium">{t(p.titolo)}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t(p.testo)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <Titolo>{t("vetrina.funzioni.titolo")}</Titolo>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FUNZIONI.map((f) => (
            <li
              key={f.titolo}
              className={`compare scheda vetro rounded-2xl p-5 ${
                f.ampio ? "sm:col-span-2 lg:col-span-1 xl:col-span-2" : ""
              }`}
            >
              <p className="font-medium">{t(f.titolo)}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(f.testo)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <Titolo>{t("vetrina.prezzo.titolo")}</Titolo>
          <p className="compare mt-3 max-w-xl text-muted">
            {t("vetrina.prezzo.sottotitolo")}
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {mensili.map((plan) => {
              const voce = VOCE_PIANO[plan.key];
              return (
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
                    <p className="text-sm text-muted">
                      {voce ? t(voce.titolo) : plan.label}
                    </p>
                    {plan.moduli.length > 1 && (
                      <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
                        {t("vetrina.prezzo.consigliato")}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
                    {t.prezzo(plan.amountCents)}
                    <span className="text-base font-normal text-muted"> {t("vetrina.prezzo.almese")}</span>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {voce ? t(voce.testo) : plan.descrizione}
                  </p>
                  {plan.note && (
                    <p className="mt-2 text-sm font-medium text-accent">
                      {voce ? t(voce.nota) : plan.note}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-muted">
                    {t("vetrina.prezzo.attivazione", {
                      prezzo: t.prezzo(setupCents(plan)),
                    })}
                  </p>
                </div>
              </div>
              );
            })}
          </div>

          <p className="compare mt-4 text-sm text-muted">
            {t("vetrina.prezzo.nota")}
          </p>

          <div className="compare mt-8 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4 font-medium" />
                  <th className="py-3 pr-4 font-medium">{t("vetrina.confronto.noi")}</th>
                  <th className="py-3 font-medium text-muted">
                    {t("vetrina.confronto.altri")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {CONFRONTO.map(([voce, noi, altri]) => (
                  <tr key={voce} className="border-b border-border/70">
                    <td className="py-3 pr-4">{t(voce)}</td>
                    <td className="py-3 pr-4 font-medium text-accent">{t(noi)}</td>
                    <td className="py-3 text-muted">{t(altri)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="compare mt-10 space-y-3">
            <h3 className="text-lg font-medium">{t("vetrina.pagamenti.titolo")}</h3>
            <p className="max-w-2xl text-muted">
              <strong>{t("vetrina.pagamenti.forte")}</strong>{" "}
              {t("vetrina.pagamenti.uno")}
            </p>
            <p className="max-w-2xl text-muted">
              {t("vetrina.pagamenti.due")}
            </p>
            <p className="max-w-2xl text-muted">
              {t("vetrina.pagamenti.tre")}
            </p>
          </div>

          <p className="compare mt-6 text-sm text-muted">
            {t("vetrina.prezzo.piede")}
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <Titolo>{t("vetrina.soloprenotazioni.titolo")}</Titolo>
        <div className="compare scheda vetro mt-8 rounded-2xl p-6">
          <p className="leading-relaxed text-muted">
            {t("vetrina.soloprenotazioni.testo")}
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <li>{t("vetrina.soloprenotazioni.capienza")}</li>
            <li>{t("vetrina.soloprenotazioni.alternative")}</li>
            <li>{t("vetrina.soloprenotazioni.calendario")}</li>
            <li>{t("vetrina.soloprenotazioni.automatica")}</li>
            <li>{t("vetrina.soloprenotazioni.noshow")}</li>
            <li>{t("vetrina.soloprenotazioni.sola")}</li>
          </ul>
          <a
            href="https://ristoranti-guest.vercel.app/p/trattoria-da-luca"
            className="mt-6 inline-flex min-h-12 items-center rounded-full border border-border px-6 font-medium"
          >
            {t("vetrina.soloprenotazioni.prova")}
          </a>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <Titolo>{t("vetrina.serve.titolo")}</Titolo>
        <ul className="compare mt-8 grid gap-3 sm:grid-cols-2">
          {SERVE.map((v) => (
            <li key={v} className="flex gap-3 text-muted">
              <span aria-hidden className="mt-1 text-accent">
                ✓
              </span>
              {t(v)}
            </li>
          ))}
        </ul>
        <p className="compare mt-5 text-sm text-muted">
          {t("vetrina.serve.nota")}
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
            {t("vetrina.chiusura.titolo")}
          </h2>
          <p className="mt-4 text-lg text-muted">
            {t("vetrina.chiusura.testo", { giorni: TRIAL_DAYS })}
          </p>
          <Link
            href="/registrati"
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-accent px-7 font-medium text-accent-foreground shadow-[0_14px_34px_-14px_var(--accent)] transition-transform active:scale-95"
          >
            {t("vetrina.chiusura.prova")}
          </Link>
          <p className="mt-4 text-sm text-muted">
            {t("vetrina.chiusura.gia")}{" "}
            <Link href="/login" className="underline underline-offset-4">
              {t("vetrina.accedi")}
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>{t("vetrina.piede.claim")}</span>
          <span className="flex flex-wrap gap-x-4">
            <Link href="/privacy" className="underline underline-offset-4">
              {t("vetrina.piede.privacy")}
            </Link>
            <Link href="/dpa" className="underline underline-offset-4">
              {t("vetrina.piede.dpa")}
            </Link>
            <a
              href="https://ristoranti-guest.vercel.app/cookie"
              className="underline underline-offset-4"
            >
              {t("vetrina.piede.cookie")}
            </a>
          </span>
        </div>
      </footer>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={t("vetrina.whatsapp.contatta")}
        className="fixed bottom-5 right-5 z-40 flex min-h-12 items-center rounded-full bg-[#1f8f55] px-5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 active:scale-95"
      >
        WhatsApp
      </a>
    </div>
  );
}
