"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tSala, type TSala } from "@/i18n/sala";
import { impostaCoperti } from "./sala-actions";
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
  chiudiConto,
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
  chiudiConto: (sessionId: string) => Promise<{ ok?: string; error?: string }>;
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
  const [inCorso, start] = useTransition();

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

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tavoli.map((tav) => {
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

                  <form
                    action={async () => {
                      // L'esito non si butta via: la chiusura può essere
                      // rifiutata perché una carta sta pagando, o riuscire
                      // segnalando che il tavolo ha versato di più.
                      const r = await chiudiConto(tav.sessionId!);
                      setAvvisoRiga(r.error ?? r.ok ?? null);
                    }}
                  >
                    <button
                      type="submit"
                      className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full border border-border text-sm"
                    >
                      {daPagare > 0
                        ? t("tavolo.incassa_chiudi")
                        : t("tavolo.chiudi_conto")}
                    </button>
                  </form>
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
              const r = await chiudiConto(tav.sessionId!);
              setAvvisoRiga(r.error ?? r.ok ?? null);
              // Rifiutata: la scheda resta aperta, o l'avviso parlerebbe di
              // un tavolo che non si sta più guardando.
              if (!r.error) setApertoId(null);
            }}
          />
        );
      })()}
    </>
  );
}
