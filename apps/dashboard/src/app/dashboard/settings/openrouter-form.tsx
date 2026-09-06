"use client";

import { useActionState, useState } from "react";
import { MODELLO_PREDEFINITO } from "@repo/shared/openrouter-tipi";
import { salvaChiaveOpenRouter, type EsitoChiave } from "../menu/etichetta-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tImpostazioni } from "@/i18n/impostazioni";
import { tComune } from "@repo/shared/i18n/comune";

const CAMPO = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

export function OpenRouterForm({
  collegata,
  modello,
}: {
  collegata: boolean;
  modello: string | null;
}) {
  const t = tImpostazioni(useLingua());
  const c = tComune(useLingua());
  const [aperto, setAperto] = useState(false);
  const [state, formAction, pending] = useActionState<EsitoChiave | null, FormData>(
    async (_prev, formData) => salvaChiaveOpenRouter(formData),
    null
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {collegata ? (
          <>
            {t("openrouter.attiva.prima")}{" "}
            <strong>{modello ?? MODELLO_PREDEFINITO}</strong>
            {t("openrouter.attiva.dopo")}
          </>
        ) : (
          t("openrouter.non_attiva")
        )}
      </p>

      {!aperto && (
        <button
          type="button"
          onClick={() => setAperto(true)}
          className="flex min-h-11 items-center px-1 text-sm underline"
        >
          {collegata ? t("openrouter.cambia") : t("openrouter.collega")}
        </button>
      )}

      {aperto && (
        <form action={formAction} className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm text-muted">
            {t("openrouter.serve.prima")} <strong>openrouter.ai</strong>
            {t("openrouter.serve.dopo")}
          </p>

          <div>
            <label className="mb-1 block text-sm" htmlFor="or-key">
              {t("openrouter.chiave")}
            </label>
            <input
              id="or-key"
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder="sk-or-..."
              className={CAMPO}
            />
            <p className="mt-1 text-xs text-muted">{t("openrouter.chiave.nota")}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm" htmlFor="or-model">
              {t("openrouter.modello")}
            </label>
            <input
              id="or-model"
              name="model"
              defaultValue={modello ?? MODELLO_PREDEFINITO}
              className={CAMPO}
            />
            <p className="mt-1 text-xs text-muted">
              {t("openrouter.modello.nota")}
            </p>
          </div>

          <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
            {t("openrouter.privacy")}
          </p>

          {collegata && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="rimuovi" className="h-5 w-5" />
              {t("openrouter.rimuovi_chiave")}
            </label>
          )}

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          {state?.success && <p className="text-sm text-success">{state.success}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {pending ? t("stato.salvo") : c("azione.salva")}
            </button>
            <button
              type="button"
              onClick={() => setAperto(false)}
              className="flex min-h-11 items-center px-3 text-sm underline"
            >
              {c("azione.chiudi")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
