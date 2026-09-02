"use client";

import { useId, useState, useTransition } from "react";
import { leggiDaFoto, type EsitoEtichetta } from "./etichetta-actions";
import type { SchedaVino } from "@repo/shared/openrouter-tipi";

const CAMPI: Array<[keyof SchedaVino, string]> = [
  ["name", "Nome"],
  ["producer", "Produttore"],
  ["vintage", "Annata"],
  ["denomination", "Denominazione"],
  ["origin", "Zona"],
  ["abv", "Gradazione"],
  ["ingredients", "Vitigni"],
  ["description", "Descrizione"],
];

/**
 * Compilazione della scheda vino da una foto dell'etichetta.
 *
 * Il risultato è una proposta da rileggere, non un salvataggio: quello che
 * finisce in carta lo legge il cliente, e un'annata sbagliata è un dato
 * falso. Il bottone di conferma copia i valori nei campi del form di
 * modifica, dove il ristoratore li vede e li corregge.
 */
export function EtichettaForm({
  attiva,
  onCompila,
}: {
  attiva: boolean;
  onCompila: (scheda: SchedaVino) => void;
}) {
  const inputId = useId();
  const [pending, start] = useTransition();
  const [esito, setEsito] = useState<EsitoEtichetta | null>(null);

  if (!attiva) {
    return (
      <p className="text-xs text-muted">
        Vuoi compilare la scheda fotografando l&apos;etichetta? Collega una
        chiave OpenRouter in <em>Impostazioni</em>.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
      <form
        action={(fd) => start(async () => setEsito(await leggiDaFoto(fd)))}
        className="flex flex-wrap items-center gap-2"
      >
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border px-4 text-sm"
        >
          {pending ? "Leggo l'etichetta…" : "Compila da foto dell'etichetta"}
        </label>
        <input
          id={inputId}
          name="etichetta"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        <span className="text-xs text-muted">
          Etichetta o scheda tecnica, fino a 800 KB
        </span>
      </form>

      {esito?.error && <p className="text-sm text-danger">{esito.error}</p>}

      {esito?.scheda && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Proposta — rileggila prima di salvare</p>
          <ul className="space-y-0.5 text-sm">
            {CAMPI.map(([chiave, etichetta]) => {
              const valore = esito.scheda?.[chiave];
              if (valore === undefined) return null;
              return (
                <li key={String(chiave)}>
                  <span className="text-muted">{etichetta}: </span>
                  {String(valore)}
                </li>
              );
            })}
            {esito.scheda.allergens && (
              <li>
                <span className="text-muted">Allergeni: </span>
                {esito.scheda.allergens.join(", ")}
              </li>
            )}
          </ul>

          {esito.avviso && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              {esito.avviso}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              onCompila(esito.scheda!);
              setEsito(null);
            }}
            className="min-h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-foreground"
          >
            Copia nei campi qui sotto
          </button>
        </div>
      )}
    </div>
  );
}
