"use client";

import { useState, useTransition } from "react";
import { formatPriceCents } from "@repo/shared";
import { impostaFormula, impostaBambini, applicaSupplemento } from "./sala-actions";

/**
 * Formula o carta su questo tavolo, bambini e supplemento.
 *
 * Sta nella card del tavolo perché è lì che si guarda: chi serve decide
 * quando siede la gente, non aprendo le impostazioni del locale. Il
 * supplemento compare solo se il locale ne ha dichiarato uno — nessun
 * programma può sapere quanto è rimasto nel piatto, quindi lo aggiunge una
 * persona guardando il tavolo.
 */
export function FormulaTavolo({
  sessionId,
  codice,
  formula,
  bambini,
  coperti,
  supplementoCents,
  supplementoPrevisto,
  onAvviso,
}: {
  sessionId: string;
  codice: string;
  formula: boolean;
  bambini: number;
  coperti: number;
  supplementoCents: number;
  /** Quanto vale il supplemento del locale. 0 = non lo applica. */
  supplementoPrevisto: number;
  onAvviso: (t: string | null) => void;
}) {
  const [aFormula, setAFormula] = useState(formula);
  const [quantiBambini, setQuantiBambini] = useState(bambini);
  const [supplemento, setSupplemento] = useState(supplementoCents > 0);
  const [pending, start] = useTransition();

  return (
    <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          [true, "Formula"],
          [false, "Alla carta"],
        ].map(([valore, etichetta]) => (
          <button
            key={String(valore)}
            type="button"
            disabled={pending}
            aria-pressed={aFormula === valore}
            onClick={() =>
              start(async () => {
                setAFormula(valore as boolean);
                const r = await impostaFormula(sessionId, valore as boolean);
                onAvviso(r.error ?? null);
                if (r.error) setAFormula(formula);
              })
            }
            className={`min-h-9 rounded-full px-3 text-xs font-medium disabled:opacity-60 ${
              aFormula === valore
                ? "bg-accent text-accent-foreground"
                : "border border-border text-muted"
            }`}
          >
            {etichetta}
          </button>
        ))}
      </div>

      {aFormula && (
        <>
          <label className="flex items-center gap-2 text-xs text-muted">
            Di cui bambini
            <select
              value={quantiBambini}
              aria-label={`Bambini al tavolo ${codice}`}
              disabled={pending}
              onChange={(e) => {
                const n = Number(e.target.value);
                setQuantiBambini(n);
                start(async () => {
                  const r = await impostaBambini(sessionId, n);
                  onAvviso(r.error ?? null);
                });
              }}
              className="min-h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            >
              {Array.from({ length: coperti + 1 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          {supplementoPrevisto > 0 && (
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={supplemento}
                disabled={pending}
                onChange={(e) => {
                  const on = e.target.checked;
                  setSupplemento(on);
                  start(async () => {
                    const r = await applicaSupplemento(sessionId, on);
                    onAvviso(r.error ?? null);
                    if (r.error) setSupplemento(!on);
                  });
                }}
                className="h-4 w-4"
              />
              Supplemento per l&apos;avanzato (
              {formatPriceCents(supplementoPrevisto)})
            </label>
          )}
        </>
      )}
    </div>
  );
}
