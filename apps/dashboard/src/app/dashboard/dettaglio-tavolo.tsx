"use client";

import { useEffect } from "react";
import { formatPriceCents } from "@repo/shared";
import type { TavoloSala } from "./sala";

const STATO_ETICHETTA: Record<string, string> = {
  pending: "da inviare",
  sent_to_kitchen: "in cucina",
  preparing: "in preparazione",
  ready: "pronto",
  served: "servito",
};

/** Piatti raggruppati per dove si trovano: è la domanda vera del titolare. */
const FASI: Array<{ chiave: string; titolo: string; stati: string[] }> = [
  { chiave: "cucina", titolo: "In cucina", stati: ["pending", "sent_to_kitchen", "preparing"] },
  { chiave: "passe", titolo: "Pronti al passe", stati: ["ready"] },
  { chiave: "tavolo", titolo: "Già in tavola", stati: ["served"] },
];

function durata(daISO: string, adesso: number): string {
  const minuti = Math.max(0, Math.floor((adesso - new Date(daISO).getTime()) / 60000));
  if (minuti < 60) return `${minuti} min`;
  return `${Math.floor(minuti / 60)}h ${String(minuti % 60).padStart(2, "0")}`;
}

/**
 * Dettaglio di un tavolo occupato.
 *
 * La scheda in griglia deve restare leggibile a colpo d'occhio da lontano,
 * quindi non può contenere tutto. Qui invece sta la situazione completa:
 * cosa è in cucina, cosa è pronto e fermo al passe — il caso che fa perdere
 * i clienti — e cosa è già in tavola.
 */
export function DettaglioTavolo({
  tavolo,
  adesso,
  onClose,
  onChiudiConto,
}: {
  tavolo: TavoloSala;
  adesso: number;
  onClose: () => void;
  onChiudiConto: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const daPagare = tavolo.ordinatoCents - tavolo.pagatoCents;
  const totaliPiatti = tavolo.righe.reduce((s, r) => s + r.quantita, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Tavolo ${tavolo.codice}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-0"
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-5 py-3 backdrop-blur">
          <div>
            <p className="text-lg font-semibold">Tavolo {tavolo.codice}</p>
            {tavolo.apertoDa && (
              <p className="text-xs text-muted">
                Aperto da {durata(tavolo.apertoDa, adesso)} · {tavolo.coperti}{" "}
                {tavolo.coperti === 1 ? "coperto" : "coperti"} · {totaliPiatti} piatti
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="h-11 w-11 shrink-0 rounded-full border border-border text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          {FASI.map((fase) => {
            const righe = tavolo.righe.filter((r) => fase.stati.includes(r.stato));
            if (righe.length === 0) return null;

            const pezzi = righe.reduce((s, r) => s + r.quantita, 0);

            return (
              <section key={fase.chiave}>
                <h3 className="mb-2 flex items-baseline justify-between text-xs font-semibold uppercase tracking-wider text-muted">
                  <span
                    className={fase.chiave === "passe" ? "text-accent" : undefined}
                  >
                    {fase.titolo}
                  </span>
                  <span className="tabular-nums">{pezzi}</span>
                </h3>
                <ul className="space-y-1.5">
                  {righe.map((r, i) => (
                    <li
                      key={`${fase.chiave}-${i}`}
                      className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                    >
                      <span className="min-w-0 text-pretty">
                        <span className="tabular-nums font-medium">{r.quantita}×</span>{" "}
                        {r.nome}
                        {r.note && (
                          <span className="block text-xs italic text-muted">{r.note}</span>
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
                        <span className="w-16 text-right tabular-nums">
                          {formatPriceCents(r.prezzoCents)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {tavolo.righe.length === 0 && (
            <p className="text-sm text-muted">
              Il tavolo è aperto ma non ha ancora ordinato nulla.
            </p>
          )}

          <section className="space-y-1 border-t border-border pt-3 text-sm tabular-nums">
            <p className="flex justify-between">
              <span className="text-muted">Ordinato</span>
              <span>{formatPriceCents(tavolo.ordinatoCents)}</span>
            </p>
            {tavolo.pagatoCents > 0 && (
              <p className="flex justify-between text-success">
                <span>Già pagato dai clienti</span>
                <span>{formatPriceCents(tavolo.pagatoCents)}</span>
              </p>
            )}
            <p className="flex justify-between text-base font-semibold">
              <span>Da incassare</span>
              <span>{formatPriceCents(Math.max(0, daPagare))}</span>
            </p>
            {tavolo.coperti > 0 && tavolo.ordinatoCents > 0 && (
              <p className="flex justify-between text-xs text-muted">
                <span>Per persona</span>
                <span>
                  {formatPriceCents(Math.round(tavolo.ordinatoCents / tavolo.coperti))}
                </span>
              </p>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard/orders"
              className="flex min-h-11 flex-1 items-center justify-center rounded-full border border-border px-4 text-sm"
            >
              Vai alle comande
            </a>
            <button
              type="button"
              onClick={onChiudiConto}
              className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground"
            >
              {daPagare > 0 ? "Incassa e chiudi" : "Chiudi conto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
