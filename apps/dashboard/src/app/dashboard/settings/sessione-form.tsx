"use client";

import { useActionState } from "react";
import { salvaSessione } from "./sessione-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tImpostazioni } from "@/i18n/impostazioni";

/**
 * Ogni quanto un tavolo riparte da zero.
 *
 * Il numero giusto è la distanza fra un turno e il successivo. Chi fa un
 * turno solo può lasciarlo alto; chi ne fa due deve metterlo sotto la
 * distanza fra i due, o il secondo turno eredita il conto del primo.
 */
export function SessioneForm({ ore }: { ore: number }) {
  const t = tImpostazioni(useLingua());
  const [state, formAction, pending] = useActionState<
    { ok?: string; error?: string } | null,
    FormData
  >(async (_prev, fd) => salvaSessione(fd), null);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm" htmlFor="sessioneOre">
          {t("sessione.ore")}
        </label>
        <input
          id="sessioneOre"
          name="sessioneOre"
          type="number"
          min="0"
          max="24"
          defaultValue={ore}
          className="min-h-11 w-40 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <p className="mt-1.5 text-xs text-muted">{t("sessione.nota")}</p>
        <p className="mt-1 text-xs text-muted">{t("sessione.nota.turni")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? t("stato.salvo") : t("sessione.salva")}
        </button>
        {state?.ok && <p className="text-sm text-success">{state.ok}</p>}
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      </div>
    </form>
  );
}
