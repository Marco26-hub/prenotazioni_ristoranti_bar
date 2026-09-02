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
  kind?: "scelta" | "aggiunta" | "rimozione";
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
          ? `Scelte di questo piatto (${gruppi.length})`
          : "Aggiungi scelte a questo piatto"}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <div>
        <h3 className="font-medium">Scelte di questo piatto</h3>
        <p className="mt-0.5 text-xs text-muted">
          Quello che il cliente sceglie quando ordina <em>questo</em> piatto.
          Per aggiungere un&apos;altra portata usa il bottone in fondo alla
          categoria.
        </p>
      </div>
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
                  {g.kind === "rimozione" ? `Senza ${o.name.toLowerCase()}` : o.name}
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

        {/* Senza intestazione questo riquadro sembrava servisse ad aggiungere
            un piatto: chi lo apriva scriveva lì il nome di una portata. */}
        <div>
          <h4 className="font-medium">Nuovo gruppo di scelte</h4>
          <p className="mt-0.5 text-xs text-muted">
            Non serve ad aggiungere piatti — quello si fa in fondo alla
            categoria. Qui aggiungi le scelte che il cliente fa{" "}
            <em>su questo piatto</em>: la cottura, la porzione, gli ingredienti
            extra.
          </p>
        </div>

        <label className="block text-xs font-medium text-muted">
          Come si chiama il gruppo
          <input
            name="name"
            placeholder="Cottura · Porzione · Aggiungi · Togli"
            required
            className={`${CAMPO} mt-1 w-full`}
          />
        </label>
        <label className="block text-xs font-medium text-muted">
          Che tipo di scelta
          <select
            name="kind"
            defaultValue="scelta"
            className={`${CAMPO} mt-1 w-full`}
          >
            <option value="scelta">Scelta — una fra più opzioni, es. la cottura</option>
            <option value="aggiunta">Aggiunta — extra a pagamento, es. bacon +1,50</option>
            <option value="rimozione">Rimozione — cosa togliere, es. senza cipolla</option>
          </select>
        </label>

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
