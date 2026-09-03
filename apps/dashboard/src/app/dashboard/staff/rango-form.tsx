"use client";

import { useState, useTransition } from "react";
import { assegnaTavoli, assegnaReparti } from "./actions";

export interface TavoloRango {
  id: string;
  code: string;
  /** userId di chi ce l'ha adesso, per mostrare i tavoli già presi. */
  assignedTo: string | null;
}

const REPARTI: Array<[string, string]> = [
  ["cucina", "Cucina"],
  ["bar", "Bar"],
  ["pizzeria", "Pizzeria"],
  ["pasticceria", "Pasticceria"],
];

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
}: {
  userId: string;
  nome: string;
  tavoli: TavoloRango[];
  /** Nome di chi tiene ciascun tavolo, per id utente. */
  altri: Record<string, string>;
  reparti: string[];
}) {
  const [suoiReparti, setSuoiReparti] = useState<string[]>(() => reparti);
  const [aperto, setAperto] = useState(false);
  const [scelti, setScelti] = useState<Set<string>>(
    () => new Set(tavoli.filter((t) => t.assignedTo === userId).map((t) => t.id))
  );
  const [avviso, setAvviso] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const miei = tavoli.filter((t) => t.assignedTo === userId);

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="min-h-10 text-sm underline underline-offset-4"
      >
        {[
          miei.length > 0 ? `Rango: ${miei.map((t) => t.code).join(", ")}` : "Assegna tavoli",
          suoiReparti.length > 0 ? `reparti: ${suoiReparti.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-lg border border-accent p-3">
      <p className="text-sm font-medium">Tavoli di {nome}</p>
      <p className="mt-0.5 text-xs text-muted">
        Vedrà per primi questi sul palmare. Può comunque agire su tutta la sala
        se serve dare una mano.
      </p>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {tavoli.map((t) => {
          const on = scelti.has(t.id);
          const diAltri = t.assignedTo && t.assignedTo !== userId;
          return (
            <li key={t.id}>
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
                      if (n.has(t.id)) n.delete(t.id);
                      else n.add(t.id);
                      return n;
                    })
                  }
                  className="h-4 w-4"
                />
                <span>
                  {t.code}
                  {diAltri && !on && (
                    <span className="ml-1 text-xs text-muted">
                      ({altri[t.assignedTo!] ?? "assegnato"})
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {tavoli.length === 0 && (
        <p className="mt-2 text-sm text-muted">
          Nessun tavolo in sala. Creane dalla pianta in Tavoli.
        </p>
      )}

      {/* Il reparto qui è un permesso, non un filtro dello schermo: senza,
          un barista poteva mandare avanti i primi dal monitor del bar. */}
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-sm font-medium">Reparti su cui può operare</p>
        <p className="mt-0.5 text-xs text-muted">
          Nessuna spunta = tutti. Fuori dai suoi reparti vede le comande ma
          non può spostarle.
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {REPARTI.map(([chiave, etichetta]) => {
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await assegnaTavoli(userId, [...scelti]);
              const rr = await assegnaReparti(userId, suoiReparti);
              setAvviso(r.error ?? rr.error ?? [r.ok, rr.ok].filter(Boolean).join(" ") ?? null);
              if (!r.error && !rr.error) setAperto(false);
            })
          }
          className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Salvo…" : "Salva rango e reparti"}
        </button>
        <button
          type="button"
          onClick={() => setAperto(false)}
          className="min-h-11 px-3 text-sm underline underline-offset-4"
        >
          Annulla
        </button>
        {avviso && <span className="text-sm">{avviso}</span>}
      </div>
    </div>
  );
}
