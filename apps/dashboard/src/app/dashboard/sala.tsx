"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPriceCents } from "@repo/shared";
import { impostaCoperti } from "./sala-actions";
import { DettaglioTavolo } from "./dettaglio-tavolo";
import { PiantaSala, type StatoTavolo } from "./pianta-sala";

export interface RigaOrdine {
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
  x: number | null;
  y: number | null;
  sessionId: string | null;
  apertoDa: string | null;
  coperti: number;
  ordinatoCents: number;
  pagatoCents: number;
  righe: RigaOrdine[];
}

const STATO_ETICHETTA: Record<string, string> = {
  pending: "da inviare",
  sent_to_kitchen: "in cucina",
  preparing: "in preparazione",
  ready: "pronto",
  served: "servito",
};

/**
 * Cosa serve sapere di un tavolo guardando la pianta, in ordine di urgenza.
 *
 * Il piatto pronto e non portato viene prima di tutto: è l'unica situazione
 * che peggiora da sola. Poi il tavolo già saldato, che è un coperto
 * recuperabile subito se qualcuno lo sparecchia.
 */
function statoTavolo(t: TavoloSala, sogliaMin: number, adesso: number): StatoTavolo {
  if (!t.sessionId) return "libero";

  // Il ritardo viene prima del pronto: chi aspetta da mezz'ora senza niente
  // davanti sta peggio di chi ha il piatto fermo al passe da due minuti.
  // Contano solo le righe non ancora pronte: una comanda vecchia ma servita
  // non è un ritardo, è una cena lunga.
  if (sogliaMin > 0) {
    const inAttesa = t.righe.filter(
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
  if (t.righe.some((r) => r.stato === "ready" && !r.trattenuto)) return "pronto";
  if (t.ordinatoCents > 0 && t.pagatoCents >= t.ordinatoCents) return "saldato";
  // Alla romana: qualcuno ha già pagato, manca il resto.
  if (t.pagatoCents > 0) return "parziale";
  return "incorso";
}

/** Ogni quanto la sala si riallinea al database. */
const INTERVALLO_MS = 15_000;

/**
 * Durata leggibile. Calcolata nel browser e non sul server: renderizzata a
 * monte resterebbe ferma all'istante del render, e un tavolo aperto da due
 * ore continuerebbe a dire "5 minuti" finché qualcuno non ricarica.
 */
function durata(daISO: string, adesso: number): string {
  const minuti = Math.max(0, Math.floor((adesso - new Date(daISO).getTime()) / 60000));
  if (minuti < 60) return `${minuti} min`;
  const ore = Math.floor(minuti / 60);
  return `${ore}h ${String(minuti % 60).padStart(2, "0")}`;
}

function orario(daISO: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(daISO));
}

export function Sala({
  tavoli,
  chiudiConto,
  piantina,
  piantinaOpacita,
  aiAttiva,
  sogliaMin,
}: {
  tavoli: TavoloSala[];
  chiudiConto: (sessionId: string) => Promise<void>;
  piantina: string | null;
  piantinaOpacita: number;
  aiAttiva: boolean;
  sogliaMin: number;
}) {
  const router = useRouter();
  const [adesso, setAdesso] = useState(() => Date.now());
  const [apertoId, setApertoId] = useState<string | null>(null);

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

  const occupati = tavoli.filter((t) => t.sessionId).length;
  const copertiOra = tavoli.reduce((s, t) => s + (t.sessionId ? t.coperti : 0), 0);
  const incassoAperto = tavoli.reduce(
    (s, t) => s + (t.sessionId ? t.ordinatoCents - t.pagatoCents : 0),
    0
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-lg font-semibold">Sala</h1>
        <p className="text-sm text-muted">
          {occupati} di {tavoli.length} occupati · {copertiOra} coperti ·{" "}
          <span className="tabular-nums">{formatPriceCents(incassoAperto)}</span> da
          incassare
        </p>
      </div>

      <PiantaSala
        tavoli={tavoli.map((t) => ({
          id: t.id,
          codice: t.codice,
          posti: t.posti,
          forma: t.forma,
          x: t.x,
          y: t.y,
          stato: statoTavolo(t, sogliaMin, adesso),
          residuoCents: t.sessionId ? t.ordinatoCents - t.pagatoCents : null,
        }))}
        piantina={piantina}
        piantinaOpacita={piantinaOpacita}
        aiAttiva={aiAttiva}
        onApri={(id) => {
          const t = tavoli.find((x) => x.id === id);
          if (t?.sessionId) setApertoId(id);
        }}
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tavoli.map((t) => {
          const aperto = Boolean(t.sessionId);
          const daPagare = t.ordinatoCents - t.pagatoCents;

          return (
            <li
              key={t.id}
              className={`rounded-xl border p-4 ${
                aperto ? "border-accent bg-accent/10" : "border-border bg-surface"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">{t.codice}</p>
                <p className="text-xs text-muted">{t.posti} posti</p>
              </div>

              {!aperto && <p className="mt-2 text-muted">libero</p>}

              {aperto && t.apertoDa && (
                <>
                  <button
                    type="button"
                    onClick={() => setApertoId(t.id)}
                    className="mt-2 flex min-h-11 w-full items-center justify-center rounded-full border border-border text-sm"
                  >
                    Vedi la situazione
                  </button>

                  <p className="mt-2 text-xs text-muted">
                    Aperto alle {orario(t.apertoDa)} · da{" "}
                    {durata(t.apertoDa, adesso)}
                  </p>

                  <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                    Coperti
                    <select
                      defaultValue={t.coperti}
                      aria-label={`Coperti del tavolo ${t.codice}`}
                      onChange={(e) =>
                        impostaCoperti(t.sessionId!, Number(e.target.value))
                      }
                      className="min-h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>

                  {t.righe.length > 0 ? (
                    <ul className="mt-3 space-y-1 border-t border-border/60 pt-2 text-sm">
                      {t.righe.map((r, i) => (
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
                            <span
                              className={`text-xs ${r.trattenuto ? "font-medium text-amber-600" : "text-muted"}`}
                            >
                              {r.trattenuto
                                ? "trattenuto"
                                : (STATO_ETICHETTA[r.stato] ?? r.stato)}
                            </span>
                            {/* Senza il prezzo di riga il totale in fondo è un
                                numero da prendere per buono: con dieci righe
                                a schermo nessuno lo ricontrolla a mente. */}
                            <span className="w-16 text-right tabular-nums">
                              {formatPriceCents(r.prezzoCents)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 border-t border-border/60 pt-2 text-sm text-muted">
                      Nessuna comanda ancora.
                    </p>
                  )}

                  <div className="mt-3 space-y-0.5 border-t border-border/60 pt-2 text-sm tabular-nums">
                    <p className="flex justify-between">
                      <span className="text-muted">Ordinato</span>
                      <span>{formatPriceCents(t.ordinatoCents)}</span>
                    </p>
                    {t.pagatoCents > 0 && (
                      <p className="flex justify-between text-success">
                        <span>Già pagato</span>
                        <span>{formatPriceCents(t.pagatoCents)}</span>
                      </p>
                    )}
                    <p className="flex justify-between font-medium">
                      <span>Da incassare</span>
                      <span>{formatPriceCents(Math.max(0, daPagare))}</span>
                    </p>
                  </div>

                  <form
                    action={async () => {
                      await chiudiConto(t.sessionId!);
                    }}
                  >
                    <button
                      type="submit"
                      className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full border border-border text-sm"
                    >
                      {daPagare > 0 ? "Incassa e chiudi" : "Chiudi conto"}
                    </button>
                  </form>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {apertoId && (() => {
        const t = tavoli.find((x) => x.id === apertoId);
        if (!t || !t.sessionId) return null;
        return (
          <DettaglioTavolo
            tavolo={t}
            adesso={adesso}
            onClose={() => setApertoId(null)}
            onChiudiConto={async () => {
              setApertoId(null);
              await chiudiConto(t.sessionId!);
            }}
          />
        );
      })()}
    </>
  );
}
