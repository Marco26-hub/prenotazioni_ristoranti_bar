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

  /*
   * Quando il server cambia idea, vince lui.
   *
   * La card non si rimonta mai: la sala si ricarica da sola con
   * router.refresh() e la key resta l'id del tavolo, quindi questi quattro
   * controlli restavano fermi all'ultimo valore toccato su questo telefono.
   * Il caso che fa danno è il taglio dei bambini: portando i coperti da sei a
   * due il database fa least(bambini, coperti) e scende a due, ma il select
   * restava a quattro — un valore senza opzione, cioè un campo vuoto su un
   * tavolo che i bambini ce li ha. Chi lo trovava vuoto sceglieva zero, e
   * quei due bambini finivano nel conto a tariffa piena. Stesso schema con
   * due telefoni sullo stesso tavolo.
   *
   * L'allineamento si fa in render confrontando l'ultimo valore arrivato dal
   * server, non in un effect: un effect ridipinge la card due volte e
   * mostrerebbe per un istante il valore vecchio — che qui è proprio il
   * numero sbagliato che stiamo togliendo di mezzo.
   */
  const [ultimoDalServer, setUltimoDalServer] = useState({
    formula,
    bambini,
    supplementoCents,
    fascia,
  });
  if (ultimoDalServer.formula !== formula) {
    setUltimoDalServer((v) => ({ ...v, formula }));
    setAFormula(formula);
  }
  if (ultimoDalServer.bambini !== bambini) {
    setUltimoDalServer((v) => ({ ...v, bambini }));
    setQuantiBambini(bambini);
  }
  if (ultimoDalServer.supplementoCents !== supplementoCents) {
    setUltimoDalServer((v) => ({ ...v, supplementoCents }));
    setSupplemento(supplementoCents > 0);
  }
  if (ultimoDalServer.fascia !== fascia) {
    setUltimoDalServer((v) => ({ ...v, fascia }));
    setFasciaScelta(fascia);
  }

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
                onAvviso(r.error ?? r.ok ?? null);
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
                    onAvviso(r.error ?? r.ok ?? null);
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
                    onAvviso(r.error ?? r.ok ?? null);
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
            {/* Il valore si tiene dentro le opzioni anche nell'attimo fra la
                scrittura e il refresh della sala: fuori intervallo il select
                non mostrerebbe niente, e un campo vuoto si legge come "zero
                bambini". */}
            <select
              value={Math.min(quantiBambini, coperti)}
              aria-label={t("formula.bambini.aria", { codice })}
              disabled={pending}
              onChange={(e) => {
                const n = Number(e.target.value);
                setQuantiBambini(n);
                start(async () => {
                  const r = await impostaBambini(sessionId, n);
                  // L'ok non è una cortesia: quando il database taglia i
                  // bambini ai coperti è l'unico posto dove il taglio viene
                  // detto a chi sta guardando il tavolo.
                  onAvviso(r.error ?? r.ok ?? null);
                  if (r.error) setQuantiBambini(bambini);
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
                    onAvviso(r.error ?? r.ok ?? null);
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
