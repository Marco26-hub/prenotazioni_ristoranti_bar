"use client";

import { useState, useTransition } from "react";
import {
  aggiungiReparto,
  rinominaReparto,
  togliReparto,
} from "./reparti-actions";

const CAMPO =
  "min-h-11 rounded-lg border border-border bg-background px-3 text-sm";

/**
 * Le postazioni del locale.
 *
 * Erano sei, scritte nel programma. Ma ogni locale è fatto a modo suo: c'è
 * chi ha due cucine, chi il forno separato dalla friggitoria, chi chiama
 * "pass" il punto in cui la sala ritira. Sei parole fisse costringono tutti
 * a incastrarsi in nomi che non sono i loro.
 *
 * Non è però un campo libero al momento dell'uso: la postazione si crea qui
 * una volta e poi si sceglie da una tendina, ovunque. Scrivendola ogni volta
 * si finisce con "Cucina", "cucina" e "CUCINA" come tre postazioni diverse,
 * e chi ha il permesso su una non ce l'ha sulle altre.
 */
export function RepartiForm({
  reparti,
  usate,
}: {
  reparti: { chiave: string; etichetta: string }[];
  /** Quante categorie stanno su ciascuna: si vede prima di togliere. */
  usate: Record<string, number>;
}) {
  const [nuovo, setNuovo] = useState("");
  const [avviso, setAvviso] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-semibold">Postazioni</h2>
      <p className="mt-0.5 text-sm text-muted">
        Dove si prepara ogni categoria. Decidono su quale schermo compare la
        comanda e chi la può muovere: il barista vede il bar, il cuoco la
        cucina.
      </p>

      <ul className="mt-3 space-y-2">
        {reparti.map((r) => (
          <li key={r.chiave} className="flex flex-wrap items-center gap-2">
            <input
              defaultValue={r.etichetta}
              aria-label={`Nome della postazione ${r.etichetta}`}
              maxLength={40}
              onBlur={(e) => {
                const nome = e.target.value.trim();
                if (nome === r.etichetta || nome.length < 2) return;
                start(async () => {
                  const esito = await rinominaReparto(r.chiave, nome);
                  setAvviso(esito.error ?? esito.ok ?? null);
                });
              }}
              className={`${CAMPO} min-w-40 flex-1`}
            />
            <span className="text-xs text-muted">
              {usate[r.chiave] ?? 0}{" "}
              {(usate[r.chiave] ?? 0) === 1 ? "categoria" : "categorie"}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const esito = await togliReparto(r.chiave);
                  setAvviso(esito.error ?? esito.ok ?? null);
                })
              }
              className="min-h-9 px-2 text-sm text-muted underline underline-offset-4 disabled:opacity-60"
            >
              Togli
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={nuovo}
          onChange={(e) => setNuovo(e.target.value)}
          placeholder="Forno, Friggitoria, Cucina 2, Pass…"
          aria-label="Nuova postazione"
          maxLength={40}
          className={`${CAMPO} min-w-48 flex-1`}
        />
        <button
          type="button"
          disabled={pending || nuovo.trim().length < 2}
          onClick={() =>
            start(async () => {
              const esito = await aggiungiReparto(nuovo);
              setAvviso(esito.error ?? esito.ok ?? null);
              if (!esito.error) setNuovo("");
            })
          }
          className="min-h-11 rounded-full border border-border px-5 text-sm disabled:opacity-60"
        >
          Aggiungi
        </button>
      </div>

      {avviso && (
        <p role="status" className="mt-2 text-sm">
          {avviso}
        </p>
      )}

      <p className="mt-2 text-xs text-muted">
        Rinominare non toglie il permesso a nessuno: quello che conta resta
        legato alla postazione, non al nome che le hai dato.
      </p>
    </section>
  );
}
