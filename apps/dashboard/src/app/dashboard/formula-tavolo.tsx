"use client";

import { useState, useTransition } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tSala } from "@/i18n/sala";
import {
  impostaFormula,
  impostaBambini,
  applicaSupplemento,
  impostaFascia,
  accettaCopertiDelTavolo,
} from "./sala-actions";

/** Le due voci del selettore, con la chiave da tradurre. */
const SCELTE: [boolean, "formula.formula" | "formula.carta"][] = [
  [true, "formula.formula"],
  [false, "formula.carta"],
];

/** Pranzo, cena, o "decidilo tu dall'orario" — che è il predefinito. */
const FASCE: [
  "pranzo" | "cena" | null,
  "formula.pranzo" | "formula.cena" | "formula.fascia.auto",
][] = [
  [null, "formula.fascia.auto"],
  ["pranzo", "formula.pranzo"],
  ["cena", "formula.cena"],
];

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
  copertiDaConfermare,
  copertiDalTavolo,
  fascia,
  supplementoCents,
  supplementoPrevisto,
  onAvviso,
}: {
  sessionId: string;
  codice: string;
  formula: boolean;
  bambini: number;
  coperti: number;
  /** A formula, nessuno ha ancora detto in quanti sono. */
  copertiDaConfermare: boolean;
  /** Il numero l'ha scritto il tavolo dal QR: basta accettarlo. */
  copertiDalTavolo: boolean;
  /** Scelta a mano; null = la decide l'orario di apertura. */
  fascia: "pranzo" | "cena" | null;
  supplementoCents: number;
  /** Quanto vale il supplemento del locale. 0 = non lo applica. */
  supplementoPrevisto: number;
  onAvviso: (t: string | null) => void;
}) {
  const t = tSala(useLingua());
  const [aFormula, setAFormula] = useState(formula);
  const [quantiBambini, setQuantiBambini] = useState(bambini);
  const [supplemento, setSupplemento] = useState(supplementoCents > 0);
  const [fasciaScelta, setFasciaScelta] = useState(fascia);
  const [pending, start] = useTransition();

  return (
    <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {SCELTE.map(([valore, etichetta]) => (
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
            {t(etichetta)}
          </button>
        ))}
      </div>

      {aFormula && copertiDaConfermare && (
        /*
         * L'avviso più importante della card, e per questo non è un colore
         * tenue: finché i coperti non li scrive qualcuno, il cliente al
         * tavolo non vede un totale e non può pagare con carta. Meglio che
         * lo veda la sala qui che scoprirlo dal cliente che chiama.
         *
         * Due forme, perché sono due lavori diversi: se il tavolo ha già
         * risposto dal QR basta un tocco per accettare; se non ha risposto
         * nessuno, il numero va scritto.
         */
        <div className="rounded-lg border border-amber-400 bg-amber-50 p-2 text-xs text-amber-900">
          {copertiDalTavolo ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>{t.n(coperti, "formula.coperti_dal_tavolo")}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await accettaCopertiDelTavolo(sessionId);
                    onAvviso(r.error ?? null);
                  })
                }
                className="min-h-9 rounded-full bg-accent px-3 font-medium text-accent-foreground disabled:opacity-60"
              >
                {t("formula.accetta_coperti")}
              </button>
            </div>
          ) : (
            <p role="alert">{t("formula.coperti_da_confermare")}</p>
          )}
        </div>
      )}

      {aFormula && (
        <>
          {/* L'etichetta sta sul gruppo, non sui bottoni: messa su ognuno
              sostituiva il testo visibile e un lettore di schermo annunciava
              tre volte la stessa frase invece di "Pranzo", "Cena". */}
          <div
            role="group"
            aria-label={t("formula.fascia.aria", { codice })}
            className="flex flex-wrap items-center gap-1.5"
          >
            <span className="text-xs text-muted">{t("formula.fascia")}</span>
            {FASCE.map(([valore, etichetta]) => (
              <button
                key={String(valore)}
                type="button"
                disabled={pending}
                aria-pressed={fasciaScelta === valore}
                onClick={() =>
                  start(async () => {
                    const prima = fasciaScelta;
                    setFasciaScelta(valore);
                    const r = await impostaFascia(sessionId, valore);
                    onAvviso(r.error ?? null);
                    if (r.error) setFasciaScelta(prima);
                  })
                }
                className={`min-h-9 rounded-full px-3 text-xs disabled:opacity-60 ${
                  fasciaScelta === valore
                    ? "bg-accent text-accent-foreground"
                    : "border border-border text-muted"
                }`}
              >
                {t(etichetta)}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-muted">
            {t("formula.bambini")}
            <select
              value={quantiBambini}
              aria-label={t("formula.bambini.aria", { codice })}
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
              {t("formula.supplemento", {
                prezzo: t.prezzo(supplementoPrevisto),
              })}
            </label>
          )}
        </>
      )}
    </div>
  );
}
