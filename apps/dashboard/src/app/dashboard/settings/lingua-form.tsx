"use client";

import { useActionState } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tImpostazioni } from "@/i18n/impostazioni";
import { LINGUE_UI, NOME_LINGUA_UI, type LinguaUI } from "@repo/shared/i18n";
import { salvaLingua, type EsitoLingua } from "./lingua-actions";

const CAMPO = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

/**
 * Due tendine che sembrano la stessa e non lo sono.
 *
 * Stanno vicine apposta: separate, chi cerca "la lingua" ne trova una e
 * pensa di aver finito. La prima cambia solo lo schermo di chi sta
 * guardando; la seconda cambia quello che vede il cliente al tavolo.
 */
export function LinguaForm({
  mia,
  pubblica,
}: {
  /** null = nessuna preferenza salvata: decide il browser. */
  mia: LinguaUI | null;
  pubblica: LinguaUI;
}) {
  const t = tImpostazioni(useLingua());
  const [state, azione, pending] = useActionState<EsitoLingua | null, FormData>(
    async (_prec, formData) => salvaLingua(formData),
    null
  );

  return (
    <form action={azione} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm" htmlFor="linguaUi">
          {t("lingua.mia")}
        </label>
        <select
          id="linguaUi"
          name="linguaUi"
          defaultValue={mia ?? ""}
          className={CAMPO}
        >
          <option value="">{t("lingua.mia.auto")}</option>
          {LINGUE_UI.map((l) => (
            <option key={l} value={l}>
              {NOME_LINGUA_UI[l]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">{t("lingua.mia.nota")}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm" htmlFor="linguaPubblica">
          {t("lingua.locale")}
        </label>
        <select
          id="linguaPubblica"
          name="linguaPubblica"
          defaultValue={pubblica}
          className={CAMPO}
        >
          {LINGUE_UI.map((l) => (
            <option key={l} value={l}>
              {NOME_LINGUA_UI[l]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">{t("lingua.locale.nota")}</p>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? t("stato.salvo") : t("lingua.salva")}
      </button>
    </form>
  );
}
