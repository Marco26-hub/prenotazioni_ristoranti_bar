"use client";

import { useState, useTransition } from "react";
import { assegnaTavoli, assegnaReparti, impostaCodiceOperatore } from "./actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tPersone } from "@/i18n/persone";


export interface TavoloRango {
  id: string;
  code: string;
  /** userId di chi ce l'ha adesso, per mostrare i tavoli già presi. */
  assignedTo: string | null;
}



/**
 * Rango e reparti di un addetto: quali tavoli sono suoi, e su cosa può agire.
 *
 * I tavoli si spuntano guardando l'elenco, come a inizio servizio. Quelli già
 * assegnati a qualcun altro restano cliccabili ma segnati: capita di
 * spostarli, e impedirlo costringerebbe a passare da due schermate.
 */
export function RangoForm({
  userId,
  nome,
  tavoli,
  altri,
  reparti,
  repartiDisponibili,
  codice,
  ruolo,
}: {
  userId: string;
  nome: string;
  tavoli: TavoloRango[];
  /** Nome di chi tiene ciascun tavolo, per id utente. */
  altri: Record<string, string>;
  reparti: string[];
  /** Le postazioni di questo locale: le decide lui, non il programma. */
  repartiDisponibili: { chiave: string; etichetta: string }[];
  codice: string | null;
  ruolo: string;
}) {
  const t = tPersone(useLingua());
  const [suoiReparti, setSuoiReparti] = useState<string[]>(() => reparti);
  const [suoCodice, setSuoCodice] = useState(codice ?? "");
  const puoAvereCodice = ruolo === "waiter" || ruolo === "kitchen";
  const [aperto, setAperto] = useState(false);
  const [scelti, setScelti] = useState<Set<string>>(
    () => new Set(tavoli.filter((x) => x.assignedTo === userId).map((x) => x.id))
  );
  const [avviso, setAvviso] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const miei = tavoli.filter((x) => x.assignedTo === userId);

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="min-h-10 text-sm underline underline-offset-4"
      >
        {[
          miei.length > 0
            ? t("rango.riepilogo", { tavoli: miei.map((x) => x.code).join(", ") })
            : t("rango.assegna"),
          suoiReparti.length > 0
            ? t("rango.riepilogo.reparti", {
                // Le etichette, non le chiavi: qui usciva "stations: cucina,
                // bar" a un titolare che legge in inglese. Le etichette le
                // rinomina il locale, quindi si prendono da lì e non da una
                // tabella nostra; una chiave sconosciuta resta com'è.
                reparti: suoiReparti
                  .map(
                    (chiave) =>
                      repartiDisponibili.find((r) => r.chiave === chiave)
                        ?.etichetta ?? chiave
                  )
                  .join(", "),
              })
            : null,
          suoCodice ? t("rango.riepilogo.codice", { codice: suoCodice }) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-lg border border-accent p-3">
      <p className="text-sm font-medium">{t("rango.tavoli_di", { nome })}</p>
      <p className="mt-0.5 text-xs text-muted">{t("rango.spiegazione")}</p>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {tavoli.map((tav) => {
          const on = scelti.has(tav.id);
          const diAltri = tav.assignedTo && tav.assignedTo !== userId;
          return (
            <li key={tav.id}>
              <label
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${
                  on ? "border-accent bg-accent/15" : "border-border"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setScelti((s) => {
                      const n = new Set(s);
                      if (n.has(tav.id)) n.delete(tav.id);
                      else n.add(tav.id);
                      return n;
                    })
                  }
                  className="h-4 w-4"
                />
                <span>
                  {tav.code}
                  {diAltri && !on && (
                    <span className="ml-1 text-xs text-muted">
                      ({altri[tav.assignedTo!] ?? t("rango.assegnato")})
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {tavoli.length === 0 && (
        <p className="mt-2 text-sm text-muted">{t("rango.nessun_tavolo")}</p>
      )}

      {/* Il reparto qui è un permesso, non un filtro dello schermo: senza,
          un barista poteva mandare avanti i primi dal monitor del bar. */}
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-sm font-medium">{t("rango.reparti.titolo")}</p>
        <p className="mt-0.5 text-xs text-muted">{t("rango.reparti.spiegazione")}</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {repartiDisponibili.map(({ chiave, etichetta }) => {
            const on = suoiReparti.includes(chiave);
            return (
              <li key={chiave}>
                <label
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${
                    on ? "border-accent bg-accent/15" : "border-border"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setSuoiReparti((p) =>
                        p.includes(chiave)
                          ? p.filter((x) => x !== chiave)
                          : [...p, chiave]
                      )
                    }
                    className="h-4 w-4"
                  />
                  {etichetta}
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {puoAvereCodice && (
        <div className="mt-3 border-t border-border pt-3">
          <label className="text-sm font-medium" htmlFor={`cod-${userId}`}>
            {t("rango.codice.etichetta")}
          </label>
          <p className="mt-0.5 text-xs text-muted">{t("rango.codice.spiegazione")}</p>
          <input
            id={`cod-${userId}`}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={suoCodice}
            onChange={(e) => setSuoCodice(e.target.value.replace(/\D/g, ""))}
            placeholder={t("rango.codice.esempio")}
            className="mt-2 min-h-11 w-32 rounded-lg border border-border bg-background px-3 text-lg tracking-widest tabular-nums"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await assegnaTavoli(userId, [...scelti]);
              const rr = await assegnaReparti(userId, suoiReparti);
              const rc = puoAvereCodice
                ? await impostaCodiceOperatore(userId, suoCodice)
                : {};
              const errore = r.error ?? rr.error ?? rc.error;
              setAvviso(errore ?? [r.ok, rr.ok, rc.ok].filter(Boolean).join(" "));
              if (!errore) setAperto(false);
            })
          }
          className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? t("rango.salvo") : t("rango.salva")}
        </button>
        <button
          type="button"
          onClick={() => setAperto(false)}
          className="min-h-11 px-3 text-sm underline underline-offset-4"
        >
          {t("rango.annulla")}
        </button>
        {avviso && <span className="text-sm">{avviso}</span>}
      </div>
    </div>
  );
}
