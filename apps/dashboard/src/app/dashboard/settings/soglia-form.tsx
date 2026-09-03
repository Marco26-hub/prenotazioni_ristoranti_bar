"use client";

import { useActionState } from "react";
import { salvaSoglia } from "./soglia-actions";

/**
 * Dopo quanti minuti una comanda va guardata.
 *
 * Il valore giusto lo sa solo il locale: venti minuti sono un'eternità per
 * una piadineria e niente per una brace. Una soglia che dice il falso viene
 * ignorata, ed è il modo peggiore di far fallire un allarme.
 */
export function SogliaForm({ minuti }: { minuti: number }) {
  const [state, formAction, pending] = useActionState<
    { ok?: string; error?: string } | null,
    FormData
  >(async (_prev, fd) => salvaSoglia(fd), null);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm" htmlFor="soglia">
          Minuti dopo i quali una comanda è in ritardo
        </label>
        <input
          id="soglia"
          name="soglia"
          type="number"
          min="0"
          max="240"
          defaultValue={minuti}
          className="min-h-11 w-40 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <p className="mt-1.5 text-xs text-muted">
          Si conta dal momento in cui il cliente ordina. Superata la soglia il
          tavolo lampeggia in rosso in sala e sul monitor comande, finché il
          piatto non è pronto. Metti <strong>0</strong> per spegnere
          l&apos;allarme.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Salvo…" : "Salva soglia"}
        </button>
        {state?.ok && <p className="text-sm text-success">{state.ok}</p>}
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      </div>
    </form>
  );
}
