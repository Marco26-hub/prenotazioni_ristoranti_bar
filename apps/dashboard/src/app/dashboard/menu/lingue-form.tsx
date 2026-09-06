"use client";

import { useActionState } from "react";
import { LINGUE } from "@repo/shared/lingue";
import { salvaLingue, type EsitoTraduzione } from "./traduzioni-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tMenuAdmin } from "@/i18n/menu";

export function LingueForm({ attive }: { attive: string[] }) {
  const t = tMenuAdmin(useLingua());
  const [state, formAction, pending] = useActionState<EsitoTraduzione | null, FormData>(
    async (_prev, formData) => salvaLingue(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm text-muted">
        {t("lingue.testo")}
      </p>

      <div className="flex flex-wrap gap-2">
        {LINGUE.map((l) => (
          <label
            key={l.codice}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10"
          >
            <input
              type="checkbox"
              name="lingue"
              value={l.codice}
              defaultChecked={attive.includes(l.codice)}
              className="h-4 w-4"
            />
            {l.nativo}
          </label>
        ))}
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        {pending ? t("lingue.salvo") : t("lingue.salva")}
      </button>
    </form>
  );
}
