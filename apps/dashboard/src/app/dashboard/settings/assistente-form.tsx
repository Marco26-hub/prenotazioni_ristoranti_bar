"use client";

import { useActionState } from "react";
import { salvaAssistente, type EsitoAssistente } from "./assistente-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tImpostazioni } from "@/i18n/impostazioni";
import { tComune } from "@repo/shared/i18n/comune";

const AREA = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

export function AssistenteForm({
  orari,
  info,
  attivo,
  chiaveCollegata,
}: {
  orari: string | null;
  info: string | null;
  attivo: boolean;
  chiaveCollegata: boolean;
}) {
  const t = tImpostazioni(useLingua());
  const c = tComune(useLingua());
  const [state, formAction, pending] = useActionState<EsitoAssistente | null, FormData>(
    async (_prev, formData) => salvaAssistente(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm" htmlFor="orari">
          {t("assistente.orari")}
        </label>
        <textarea
          id="orari"
          name="orari"
          rows={3}
          defaultValue={orari ?? ""}
          placeholder={t("assistente.orari.placeholder")}
          className={AREA}
        />
        <p className="mt-1 text-xs text-muted">{t("assistente.orari.nota")}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm" htmlFor="info">
          {t("assistente.info")}
        </label>
        <textarea
          id="info"
          name="info"
          rows={3}
          defaultValue={info ?? ""}
          placeholder={t("assistente.info.placeholder")}
          className={AREA}
        />
        <p className="mt-1 text-xs text-muted">{t("assistente.info.nota")}</p>
      </div>

      <label className="flex min-h-11 items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="assistente"
          defaultChecked={attivo}
          disabled={!chiaveCollegata}
          className="mt-0.5 h-5 w-5"
        />
        <span>
          {t("assistente.accendi")}
          <span className="block text-xs text-muted">
            {chiaveCollegata
              ? t("assistente.accendi.costo")
              : t("assistente.accendi.serve_chiave")}
          </span>
        </span>
      </label>

      <p className="rounded-lg border border-border p-3 text-xs text-muted">
        {t("assistente.limiti")}
      </p>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground disabled:opacity-50"
      >
        {pending ? t("stato.salvataggio") : c("azione.salva")}
      </button>
    </form>
  );
}
