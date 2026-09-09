"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLingua } from "@repo/shared/i18n/contesto";
import type { MetodoIncasso } from "@repo/shared/fiscale";
import { tSala, type TSala } from "@/i18n/sala";
import { impostaCoperti } from "./sala-actions";
import { closeTableInPerson } from "./close-table-actions";
import { FormulaTavolo } from "./formula-tavolo";
import { DettaglioTavolo } from "./dettaglio-tavolo";
import { PiantaSala, type StatoTavolo } from "./pianta-sala";

export interface RigaOrdine {
  id: string;
  nome: string;
  quantita: number;
  prezzoCents: number;
  stato: string;
  note: string | null;
  trattenuto: boolean;
  ordinatoIl: string;
}

export interface TavoloSala {
  id: string;
  codice: string;
  posti: number;
  forma: string;
  zona: string | null;
  x: number | null;
  y: number | null;
  sessionId: string | null;
  apertoDa: string | null;
  coperti: number;
  /** Il tavolo paga a formula invece che a piatto. */
  formula: boolean;
  bambini: number;
  /** A formula, nessuno ha ancora dichiarato in quanti sono. */
  copertiDaConfermare: boolean;
  /** Il numero l'ha scritto il tavolo dal QR: alla sala basta accettarlo. */
  copertiDalTavolo: boolean;
  /** Fascia scelta a mano; null = la decide l'orario di apertura. */
  fascia: "pranzo" | "cena" | null;
  supplementoCents: number;
  /** Il dovuto per intero: piatti, formula, coperto e servizio. */
  ordinatoCents: number;
  pagatoCents: number;
  nPagamenti: number;
  ultimoPagamento: string | null;
  righe: RigaOrdine[];
}

/** Dove porta il tocco, e come si chiama il gesto. */
const AVANTI: Record<
  string,
  { a: string; testo: "riga.avanza.preparing" | "riga.avanza.ready" | "riga.avanza.served" }
> = {
  sent_to_kitchen: { a: "preparing", testo: "riga.avanza.preparing" },
  preparing: { a: "ready", testo: "riga.avanza.ready" },
  ready: { a: "served", testo: "riga.avanza.served" },
};

/**
 * Come si può incassare al banco, nell'ordine in cui capita.
 *
 * Tre bottoni e non un menu a tendina: si tocca in piedi, con il POS in una
 * mano, e il mezzo è l'unica cosa che il documento commerciale non può
 * indovinare. I contanti restano per primi perché sono il caso più
 * frequente, ma non sono più il predefinito silenzioso.
 */
const MEZZI: readonly {
  metodo: MetodoIncasso;
  etichetta: "tavolo.mezzo.cash" | "tavolo.mezzo.card" | "tavolo.mezzo.satispay";
}[] = [
  { metodo: "cash", etichetta: "tavolo.mezzo.cash" },
  { metodo: "card", etichetta: "tavolo.mezzo.card" },
  { metodo: "satispay", etichetta: "tavolo.mezzo.satispay" },
];

const COLORE_STATO: Record<string, string> = {
  pending: "text-zinc-400",
  sent_to_kitchen: "text-violet-400",
  preparing: "text-amber-500",
  ready: "text-sky-400",
  served: "text-emerald-500",
};

const STATO_ETICHETTA: Record<
  string,
  | "riga.stato.pending"
  | "riga.stato.sent_to_kitchen"
  | "riga.stato.preparing"
  | "riga.stato.ready"
  | "riga.stato.served"
> = {
  pending: "riga.stato.pending",
  sent_to_kitchen: "riga.stato.sent_to_kitchen",
  preparing: "riga.stato.preparing",
  ready: "riga.stato.ready",
  served: "riga.stato.served",
};

/**
 * Cosa serve sapere di un tavolo guardando la pianta, in ordine di urgenza.
 *
 * Il piatto pronto e non portato viene prima di tutto: è l'unica situazione
 * che peggiora da sola. Poi il tavolo già saldato, che è un coperto
 * recuperabile subito se qualcuno lo sparecchia.
 */
function statoTavolo(
  tav: TavoloSala,
  sogliaMin: number,
  adesso: number,
  sogliaLiberazioneMin = 15
): StatoTavolo {
  if (!tav.sessionId) return "libero";

  // Il ritardo viene prima del pronto: chi aspetta da mezz'ora senza niente
  // davanti sta peggio di chi ha il piatto fermo al passe da due minuti.
  // Contano solo le righe non ancora pronte: una comanda vecchia ma servita
  // non è un ritardo, è una cena lunga.
  if (sogliaMin > 0) {
    const inAttesa = tav.righe.filter(
      (r) => !r.trattenuto && r.stato !== "ready" && r.stato !== "served"
    );
    const piuVecchia = inAttesa.reduce<number | null>((acc, r) => {
      const q = new Date(r.ordinatoIl).getTime();
      return acc === null || q < acc ? q : acc;
    }, null);
    if (piuVecchia !== null && adesso - piuVecchia >= sogliaMin * 60_000) {
      return "ritardo";
    }
  }

  // Il cibo pronto batte tutto: si raffredda mentre si discute del conto.
  // Un piatto trattenuto è fermo per decisione della sala, non perché
  // nessuno lo porta: farlo lampeggiare rosso in cassa manderebbe qualcuno a
  // correre per un piatto che deve restare dov'è.
  if (tav.righe.some((r) => r.stato === "ready" && !r.trattenuto)) return "pronto";
  if (tav.ordinatoCents > 0 && tav.pagatoCents >= tav.ordinatoCents) {
    // Pagato e ancora seduti: per un po' è normale — il caffè, i cappotti,
    // il conto appena arrivato. Passata la soglia è un coperto già incassato
    // che tiene occupato un tavolo mentre fuori c'è gente.
    if (
      sogliaLiberazioneMin > 0 &&
      tav.ultimoPagamento &&
      adesso - new Date(tav.ultimoPagamento).getTime() >= sogliaLiberazioneMin * 60_000
    ) {
      return "daliberare";
    }
    return "saldato";
  }
  // Alla romana: qualcuno ha già pagato, manca il resto.
  if (tav.pagatoCents > 0) return "parziale";
  return "incorso";
}

/** Ogni quanto la sala si riallinea al database. */
const INTERVALLO_MS = 15_000;

/**
 * Durata leggibile. Calcolata nel browser e non sul server: renderizzata a
 * monte resterebbe ferma all'istante del render, e un tavolo aperto da due
 * ore continuerebbe a dire "5 minuti" finché qualcuno non ricarica.
 */
function durata(daISO: string, adesso: number, t: TSala): string {
  const minuti = Math.max(0, Math.floor((adesso - new Date(daISO).getTime()) / 60000));
  if (minuti < 60) return t("durata.minuti", { n: minuti });
  const ore = Math.floor(minuti / 60);
  return t("durata.ore", { ore, minuti: String(minuti % 60).padStart(2, "0") });
}

export function Sala({
  tavoli,
  formulaAttiva,
  supplementoPrevisto,
  avanzaRiga,
  piantina,
  piantinaOpacita,
  aiAttiva,
  sogliaMin,
  sogliaLiberazioneMin,
}: {
  tavoli: TavoloSala[];
  /**
   * Non più usata: la chiusura chiama l'azione direttamente perché deve
   * portarsi dietro il mezzo con cui il tavolo ha pagato, e passando di qui
   * lo perderebbe. Resta dichiarata finché la pagina continua a passarla.
   */
  chiudiConto?: (sessionId: string) => Promise<{ ok?: string; error?: string }>;
  /** Il locale propone una formula a prezzo fisso. */
  formulaAttiva: boolean;
  supplementoPrevisto: number;
  avanzaRiga: (
    itemId: string,
    a: string,
    da: string
  ) => Promise<{ error?: string }>;
  piantina: string | null;
  piantinaOpacita: number;
  aiAttiva: boolean;
  sogliaMin: number;
  sogliaLiberazioneMin: number;
}) {
  const t = tSala(useLingua());
  const router = useRouter();
  const [adesso, setAdesso] = useState(() => Date.now());
  const [apertoId, setApertoId] = useState<string | null>(null);
  const [avvisoRiga, setAvvisoRiga] = useState<string | null>(null);
  const [vistaSchede, setVistaSchede] = useState<"attivi" | "tutti">("attivi");
  const [inCorso, start] = useTransition();
  /** La sessione che si sta chiudendo: un doppio tocco non incassa due volte. */
  const [inChiusura, setInChiusura] = useState<string | null>(null);
  /**
   * Il tavolo per cui la scheda di dettaglio sta chiedendo il mezzo.
   *
   * Nella scheda il bottone per chiudere è uno solo, e su di lei non c'è
   * spazio per tre: il mezzo si chiede qui, sopra la sala, prima di
   * scrivere l'incasso.
   */
  const [mezzoPer, setMezzoPer] = useState<{ sessionId: string; codice: string } | null>(
    null
  );

  /**
   * Chiude il conto dichiarando come è stato pagato.
   *
   * `mezzo` manca solo quando non resta niente da incassare: in quel caso
   * non nasce nessuna riga di pagamento e non c'è nulla da dichiarare.
   */
  async function chiudi(sessionId: string, mezzo?: MetodoIncasso) {
    setInChiusura(sessionId);
    try {
      const r = await closeTableInPerson(sessionId, mezzo);
      // L'esito non si butta via: la chiusura può essere rifiutata perché
      // una carta sta pagando, o riuscire segnalando che il tavolo ha
      // versato di più.
      setAvvisoRiga(r.error ?? r.ok ?? null);
      if (!r.error) router.refresh();
      return r;
    } finally {
      setInChiusura(null);
    }
  }

  // Due ritmi diversi di proposito: l'orologio scatta ogni minuto perché è
  // l'unità in cui si legge una permanenza, i dati si ricaricano ogni quindici
  // secondi perché è la frequenza con cui arriva una comanda.
  useEffect(() => {
    const orologio = setInterval(() => setAdesso(Date.now()), 60_000);
    const dati = setInterval(() => router.refresh(), INTERVALLO_MS);
    return () => {
      clearInterval(orologio);
      clearInterval(dati);
    };
  }, [router]);

  const occupati = tavoli.filter((tav) => tav.sessionId).length;
  const copertiOra = tavoli.reduce((s, tav) => s + (tav.sessionId ? tav.coperti : 0), 0);
  const incassoAperto = tavoli.reduce(
    (s, tav) => s + (tav.sessionId ? tav.ordinatoCents - tav.pagatoCents : 0),
    0
  );
  /*
   * Quanti tavoli aspettano i coperti.
   *
   * Sta in cima e non solo dentro le card: a prezzo fisso quei tavoli non
   * possono pagare con carta e non vedono un totale, e con quaranta coperti
   * su due turni nessuno apre le card una per una per accorgersene. Lo si
   * scoprirebbe dal cliente che chiama, cioè tardi.
   */
  const daConfermare = tavoli.filter(
    (tav) => tav.sessionId && tav.copertiDaConfermare
  ).length;
  const tavoliSchede =
    vistaSchede === "attivi" ? tavoli.filter((tav) => tav.sessionId) : tavoli;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-lg font-semibold">{t("sala.titolo")}</h1>
        <p className="text-sm text-muted">
          {t("sala.riepilogo.occupati", { occupati, totale: tavoli.length })} ·{" "}
          {t.n(copertiOra, "sala.riepilogo.coperti")} ·{" "}
          <span className="tabular-nums">{t.prezzo(incassoAperto)}</span>{" "}
          {t("sala.riepilogo.incasso")}
        </p>
      </div>

      {daConfermare > 0 && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {t.n(daConfermare, "sala.coperti_mancanti")}
        </p>
      )}

      <PiantaSala
        tavoli={tavoli.map((tav) => ({
          id: tav.id,
          codice: tav.codice,
          posti: tav.posti,
          forma: tav.forma,
          zona: tav.zona,
          x: tav.x,
          y: tav.y,
          stato: statoTavolo(tav, sogliaMin, adesso, sogliaLiberazioneMin),
          residuoCents: tav.sessionId ? tav.ordinatoCents - tav.pagatoCents : null,
        }))}
        piantina={piantina}
        piantinaOpacita={piantinaOpacita}
        aiAttiva={aiAttiva}
        onApri={(id) => {
          const tav = tavoli.find((x) => x.id === id);
          if (tav?.sessionId) setApertoId(id);
        }}
      />

      {avvisoRiga && (
        <p role="alert" className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {avvisoRiga}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{t("sala.schede.titolo")}</h2>
        <div className="flex rounded-lg border border-border bg-surface p-1">
          {(["attivi", "tutti"] as const).map((vista) => (
            <button
              key={vista}
              type="button"
              aria-pressed={vistaSchede === vista}
              onClick={() => setVistaSchede(vista)}
              className={`min-h-10 rounded-md px-3 text-sm font-medium ${
                vistaSchede === vista ? "bg-accent text-accent-foreground" : "text-muted"
              }`}
            >
              {vista === "attivi"
                ? t("sala.schede.attivi", { n: occupati })
                : t("sala.schede.tutti", { n: tavoli.length })}
            </button>
          ))}
        </div>
      </div>

      {tavoliSchede.length === 0 && (
        <p className="mb-3 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          {t("sala.schede.nessun_attivo")}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tavoliSchede.map((tav) => {
          const aperto = Boolean(tav.sessionId);
          const daPagare = tav.ordinatoCents - tav.pagatoCents;

          return (
            <li
              key={tav.id}
              className={`rounded-xl border p-4 ${
                aperto ? "border-accent bg-accent/10" : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Lime fluo riservato al numero del tavolo e a nient'altro:
                    portare un piatto al tavolo sbagliato è l'errore più
                    facile e più caro della sala, e il numero deve leggersi
                    da lontano senza confondersi con gli stati. */}
                <p className="rounded-lg bg-lime-300 px-2.5 py-0.5 text-2xl font-black leading-tight tracking-tight text-zinc-900">
                  {tav.codice}
                </p>
                <p className="text-xs text-muted">{t.n(tav.posti, "tavolo.posti")}</p>
              </div>

              {!aperto && <p className="mt-2 text-muted">{t("tavolo.libero")}</p>}

              {aperto && tav.apertoDa && (
                <>
                  <button
                    type="button"
                    onClick={() => setApertoId(tav.id)}
                    className="mt-2 flex min-h-11 w-full items-center justify-center rounded-full border border-border text-sm"
                  >
                    {t("tavolo.vedi")}
                  </button>

                  <p className="mt-2 text-xs text-muted">
                    {t("tavolo.aperto", {
                      ora: t.ora(new Date(tav.apertoDa)),
                      durata: durata(tav.apertoDa, adesso, t),
                    })}
                  </p>

                  <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                    {t("tavolo.coperti")}
                    <select
                      defaultValue={tav.coperti}
                      aria-label={t("tavolo.coperti.aria", { codice: tav.codice })}
                      onChange={(e) => {
                        // Attesa, non lanciata e dimenticata: se la scrittura
                        // fallisce il numero a schermo resterebbe quello
                        // scelto e il conto userebbe l'altro.
                        const n = Number(e.target.value);
                        void impostaCoperti(tav.sessionId!, n).then((r) =>
                          setAvvisoRiga(r?.error ?? null)
                        );
                      }}
                      className="min-h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>

                  {formulaAttiva && tav.sessionId && (
                    <FormulaTavolo
                      sessionId={tav.sessionId}
                      codice={tav.codice}
                      formula={tav.formula}
                      bambini={tav.bambini}
                      coperti={tav.coperti}
                      copertiDaConfermare={tav.copertiDaConfermare}
                      copertiDalTavolo={tav.copertiDalTavolo}
                      fascia={tav.fascia}
                      supplementoCents={tav.supplementoCents}
                      supplementoPrevisto={supplementoPrevisto}
                      onAvviso={setAvvisoRiga}
                    />
                  )}

                  {tav.righe.length > 0 ? (
                    <ul className="mt-3 space-y-1 border-t border-border/60 pt-2 text-sm">
                      {tav.righe.map((r, i) => (
                        <li
                          key={i}
                          className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2"
                        >
                          <span className="min-w-0 text-pretty">
                            <span className="tabular-nums text-muted">{r.quantita}×</span>{" "}
                            {r.nome}
                            {r.note && (
                              <span className="block text-xs italic text-muted">
                                {r.note}
                              </span>
                            )}
                          </span>
                          <span className="flex shrink-0 items-baseline gap-2 self-end sm:self-auto">
                            {r.trattenuto ? (
                              <span className="text-xs font-medium text-amber-600">
                                {t("riga.trattenuto")}
                              </span>
                            ) : AVANTI[r.stato] ? (
                              <button
                                type="button"
                                disabled={inCorso}
                                onClick={() =>
                                  start(async () => {
                                    const res = await avanzaRiga(
                                      r.id,
                                      AVANTI[r.stato].a,
                                      r.stato
                                    );
                                    setAvvisoRiga(res?.error ?? null);
                                    router.refresh();
                                  })
                                }
                                className={`min-h-9 rounded-full border px-3 text-xs font-medium disabled:opacity-50 ${COLORE_STATO[r.stato] ?? ""} border-current`}
                              >
                                {t(AVANTI[r.stato].testo)} →
                              </button>
                            ) : (
                              <span
                                className={`text-xs font-medium ${COLORE_STATO[r.stato] ?? "text-muted"}`}
                              >
                                {STATO_ETICHETTA[r.stato]
                                  ? t(STATO_ETICHETTA[r.stato])
                                  : r.stato}
                              </span>
                            )}
                            {/* Senza il prezzo di riga il totale in fondo è un
                                numero da prendere per buono: con dieci righe
                                a schermo nessuno lo ricontrolla a mente. */}
                            <span className="w-16 text-right tabular-nums">
                              {t.prezzo(r.prezzoCents)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 border-t border-border/60 pt-2 text-sm text-muted">
                      {t("tavolo.nessuna_comanda")}
                    </p>
                  )}

                  <div className="mt-3 space-y-0.5 border-t border-border/60 pt-2 text-sm tabular-nums">
                    <p className="flex justify-between">
                      {/* Non "ordinato": il totale comprende formula,
                          coperto e servizio, ed è quello che il cliente
                          vede sul telefono. */}
                      <span className="text-muted">{t("tavolo.totale")}</span>
                      <span>{t.prezzo(tav.ordinatoCents)}</span>
                    </p>
                    {tav.pagatoCents > 0 && (
                      <p className="flex justify-between text-success">
                        <span>{t("tavolo.gia_pagato")}</span>
                        <span>{t.prezzo(tav.pagatoCents)}</span>
                      </p>
                    )}
                    <p className="flex justify-between font-medium">
                      <span>{t("tavolo.da_incassare")}</span>
                      <span>{t.prezzo(Math.max(0, daPagare))}</span>
                    </p>
                  </div>

                  {daPagare > 0 ? (
                    /*
                     * Il mezzo si sceglie incassando, in un tocco solo.
                     *
                     * Prima il bottone era uno e la riga di incasso nasceva
                     * sempre in contanti: il documento commerciale
                     * dichiarava contante anche il bancomat passato al
                     * banco, cento volte al giorno, ed è proprio lo
                     * scostamento con i dati dell'acquirer che viene
                     * incrociato.
                     */
                    <div className="mt-3">
                      <p className="mb-1 text-xs text-muted">
                        {t("tavolo.come_ha_pagato")}
                      </p>
                      <div className="flex gap-2">
                        {MEZZI.map((m) => (
                          <button
                            key={m.metodo}
                            type="button"
                            disabled={inChiusura === tav.sessionId}
                            aria-label={t("tavolo.incassa_chiudi.aria", {
                              codice: tav.codice,
                              mezzo: t(m.etichetta),
                            })}
                            onClick={() => void chiudi(tav.sessionId!, m.metodo)}
                            className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-border text-sm font-medium disabled:opacity-50"
                          >
                            {t(m.etichetta)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={inChiusura === tav.sessionId}
                      onClick={() => void chiudi(tav.sessionId!)}
                      className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full border border-border text-sm disabled:opacity-50"
                    >
                      {t("tavolo.chiudi_conto")}
                    </button>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {apertoId && (() => {
        const tav = tavoli.find((x) => x.id === apertoId);
        if (!tav || !tav.sessionId) return null;
        return (
          <DettaglioTavolo
            tavolo={tav}
            adesso={adesso}
            onClose={() => setApertoId(null)}
            onChiudiConto={async () => {
              // Con un residuo da incassare la scheda non chiude niente da
              // sola: prima si dichiara il mezzo, altrimenti il documento
              // tornerebbe a dire contante per tutti.
              if (tav.ordinatoCents - tav.pagatoCents > 0) {
                setApertoId(null);
                setMezzoPer({ sessionId: tav.sessionId!, codice: tav.codice });
                return;
              }
              const r = await chiudi(tav.sessionId!);
              // Rifiutata: la scheda resta aperta, o l'avviso parlerebbe di
              // un tavolo che non si sta più guardando.
              if (!r.error) setApertoId(null);
            }}
          />
        );
      })()}

      {mezzoPer && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setMezzoPer(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("tavolo.come_ha_pagato")}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-5"
          >
            <p className="mb-3 text-sm font-medium">
              {t("tavolo.come_ha_pagato")}
            </p>
            <div className="flex gap-2">
              {MEZZI.map((m) => (
                <button
                  key={m.metodo}
                  type="button"
                  disabled={inChiusura === mezzoPer.sessionId}
                  aria-label={t("tavolo.incassa_chiudi.aria", {
                    codice: mezzoPer.codice,
                    mezzo: t(m.etichetta),
                  })}
                  onClick={async () => {
                    const r = await chiudi(mezzoPer.sessionId, m.metodo);
                    // Rifiutata — una carta in corso, i coperti da
                    // confermare — la scelta resta aperta: chiudendola
                    // l'avviso parlerebbe di un tavolo che non si sta più
                    // guardando.
                    if (!r.error) setMezzoPer(null);
                  }}
                  className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-border text-sm font-medium disabled:opacity-50"
                >
                  {t(m.etichetta)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMezzoPer(null)}
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full text-sm text-muted"
            >
              {t("tavolo.annulla")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
