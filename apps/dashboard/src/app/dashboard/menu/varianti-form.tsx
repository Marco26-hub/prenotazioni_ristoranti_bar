"use client";

import { useState, useTransition } from "react";
import { formatPriceCents } from "@repo/shared";
import {
  creaGruppo,
  eliminaGruppo,
  creaOpzione,
  eliminaOpzione,
  commutaOpzione,
} from "./varianti-actions";

export interface OpzioneAdmin {
  id: string;
  name: string;
  price_delta_cents: number;
  available: boolean;
}

export interface GruppoAdmin {
  id: string;
  name: string;
  required: boolean;
  max_choices: number;
  opzioni: OpzioneAdmin[];
}

const CAMPO = "min-h-11 rounded-lg border border-border bg-background px-3 text-sm";

/**
 * Varianti e aggiunte di un piatto.
 *
 * Chiuso di default: la maggior parte dei piatti non ne ha, e mostrarne la
 * configurazione su ognuno riempirebbe la pagina di cose che non servono.
 */
export function VariantiForm({
  itemId,
  gruppi,
}: {
  itemId: string;
  gruppi: GruppoAdmin[];
}) {
  const [aperto, setAperto] = useState(false);
  const [pending, start] = useTransition();
  const [esito, setEsito] = useState<string | null>(null);

  function esegui(fn: () => Promise<{ error?: string; success?: string }>) {
    setEsito(null);
    start(async () => {
      const r = await fn();
      setEsito(r.error ?? r.success ?? null);
    });
  }

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="mt-3 flex min-h-11 items-center border-t border-border pt-3 text-sm underline"
      >
        {gruppi.length > 0
          ? `Varianti e aggiunte (${gruppi.length})`
          : "Aggiungi varianti o supplementi"}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {gruppi.map((g) => (
        <div key={g.id} className="rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">
              {g.name}{" "}
              <span className="text-xs font-normal text-muted">
                {g.required ? "obbligatorio" : "facoltativo"}
                {g.max_choices > 1 ? " · scelte multiple" : ""}
              </span>
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => esegui(() => eliminaGruppo(g.id))}
              className="flex min-h-11 items-center px-1 text-sm text-danger underline"
            >
              Elimina gruppo
            </button>
          </div>

          <ul className="mt-2 space-y-1">
            {g.opzioni.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                <span className={o.available ? "" : "text-muted line-through"}>
                  {o.name}
                  {o.price_delta_cents !== 0 && (
                    <span className="ml-2 tabular-nums text-muted">
                      {o.price_delta_cents > 0 ? "+" : "−"}
                      {formatPriceCents(Math.abs(o.price_delta_cents))}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-x-3">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => esegui(() => commutaOpzione(o.id, !o.available))}
                    className="flex min-h-11 items-center px-1 text-xs underline"
                  >
                    {o.available ? "Esaurito" : "Ripristina"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => esegui(() => eliminaOpzione(o.id))}
                    className="flex min-h-11 items-center px-1 text-xs text-danger underline"
                  >
                    Elimina
                  </button>
                </span>
              </li>
            ))}
            {g.opzioni.length === 0 && (
              <li className="text-sm text-muted">
                Nessuna scelta: finché è vuoto, il gruppo non compare al cliente.
              </li>
            )}
          </ul>

          <form
            action={(fd) => esegui(() => creaOpzione(fd))}
            className="mt-2 flex flex-wrap gap-2"
          >
            <input type="hidden" name="groupId" value={g.id} />
            <input
              name="name"
              placeholder="12 pezzi, Avocado, Al sangue…"
              required
              className={`${CAMPO} w-full min-w-0 flex-1 sm:w-auto`}
            />
            <input
              name="delta"
              type="number"
              step="0.01"
              defaultValue={0}
              aria-label="Supplemento in euro"
              className={`${CAMPO} w-24`}
            />
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-full border border-border px-4 text-sm"
            >
              Aggiungi scelta
            </button>
          </form>
        </div>
      ))}

      <form
        action={(fd) => esegui(() => creaGruppo(fd))}
        className="space-y-2 rounded-lg border border-dashed border-border p-3"
      >
        <input type="hidden" name="itemId" value={itemId} />
        <input
          name="name"
          placeholder="Nome del gruppo: Quanti pezzi, Cottura, Aggiunte…"
          required
          className={`${CAMPO} w-full`}
        />
        <div className="flex flex-wrap gap-4">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="required" className="h-5 w-5" />
            Il cliente deve scegliere
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="multiple" className="h-5 w-5" />
            Può sceglierne più di una
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          Crea gruppo
        </button>
      </form>

      {esito && <p className="text-sm text-muted">{esito}</p>}

      <button
        type="button"
        onClick={() => setAperto(false)}
        className="flex min-h-11 items-center px-1 text-sm underline"
      >
        Chiudi
      </button>
    </div>
  );
}
