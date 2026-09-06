"use client";

import { useActionState } from "react";
import { salvaSoglia } from "./soglia-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tImpostazioni } from "@/i18n/impostazioni";

/**
 * Dopo quanti minuti una comanda va guardata.
 *
 * Il valore giusto lo sa solo il locale: venti minuti sono un'eternità per
 * una piadineria e niente per una brace. Una soglia che dice il falso viene
 * ignorata, ed è il modo peggiore di far fallire un allarme.
 */
export function SogliaForm({
  minuti,
  liberazione,
}: {
  minuti: number;
  liberazione: number;
}) {
  const t = tImpostazioni(useLingua());
  const [state, formAction, pending] = useActionState<
    { ok?: string; error?: string } | null,
    FormData
  >(async (_prev, fd) => salvaSoglia(fd), null);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm" htmlFor="soglia">
          {t("soglia.ritardo")}
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
          {t("soglia.ritardo.nota.prima")} <strong>0</strong>
          {t("soglia.ritardo.nota.dopo")}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm" htmlFor="liberazione">
          {t("soglia.recupero")}
        </label>
        <input
          id="liberazione"
          name="liberazione"
          type="number"
          min="0"
          max="240"
          defaultValue={liberazione}
          className="min-h-11 w-40 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <p className="mt-1.5 text-xs text-muted">
          {t("soglia.recupero.nota.prima")} <strong>0</strong>
          {t("soglia.recupero.nota.dopo")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? t("stato.salvo") : t("soglia.salva")}
        </button>
        {state?.ok && <p className="text-sm text-success">{state.ok}</p>}
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      </div>
    </form>
  );
}
