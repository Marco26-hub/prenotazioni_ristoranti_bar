"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPriceCents } from "@repo/shared";
import { impostaCoperti } from "./sala-actions";
import { DettaglioTavolo } from "./dettaglio-tavolo";

export interface RigaOrdine {
  nome: string;
  quantita: number;
  stato: string;
  note: string | null;
}

export interface TavoloSala {
  id: string;
  codice: string;
  posti: number;
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
}: {
  tavoli: TavoloSala[];
  chiudiConto: (sessionId: string) => Promise<void>;
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
                        <li key={i} className="flex items-baseline justify-between gap-2">
                          <span className="min-w-0">
                            <span className="tabular-nums text-muted">{r.quantita}×</span>{" "}
                            {r.nome}
                            {r.note && (
                              <span className="block text-xs italic text-muted">
                                {r.note}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-xs text-muted">
                            {STATO_ETICHETTA[r.stato] ?? r.stato}
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
