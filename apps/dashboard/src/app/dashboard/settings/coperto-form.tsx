"use client";

import { useActionState } from "react";
import { salvaCoperto, type EsitoCoperto } from "./coperto-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tImpostazioni } from "@/i18n/impostazioni";
import { tComune } from "@repo/shared/i18n/comune";

const CAMPO = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

export function CopertoForm({
  copertoCents,
  servizio,
  ivaSupplementi,
  intervallo,
  etichetta,
}: {
  copertoCents: number;
  servizio: number;
  ivaSupplementi: number;
  intervallo: number;
  etichetta: string | null;
}) {
  const t = tImpostazioni(useLingua());
  const c = tComune(useLingua());
  const [state, formAction, pending] = useActionState<EsitoCoperto | null, FormData>(
    async (_prev, formData) => salvaCoperto(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm" htmlFor="coperto">
            {t("coperto.importo")}
          </label>
          <input
            id="coperto"
            name="coperto"
            type="number"
            step="0.01"
            min="0"
            max="50"
            defaultValue={(copertoCents / 100).toFixed(2)}
            className={CAMPO}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm" htmlFor="servizio">
            {t("coperto.servizio")}
          </label>
          <input
            id="servizio"
            name="servizio"
            type="number"
            step="0.1"
            min="0"
            max="30"
            defaultValue={servizio}
            className={CAMPO}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm" htmlFor="ivaSupplementi">
          {t("coperto.iva")}
        </label>
        <input
          id="ivaSupplementi"
          name="ivaSupplementi"
          type="number"
          step="0.01"
          min="0"
          max="30"
          defaultValue={ivaSupplementi}
          className={CAMPO}
        />
        <p className="mt-1 text-xs text-muted">{t("coperto.iva.nota")}</p>
      </div>

      <div>
          <label className="mb-1 block text-sm" htmlFor="intervallo">
            {t("coperto.intervallo")}
          </label>
          <input
            id="intervallo"
            name="intervallo"
            type="number"
            step="1"
            min="0"
            max="120"
            defaultValue={intervallo}
            className={CAMPO}
          />
          <p className="mt-1 text-xs text-muted">{t("coperto.intervallo.nota")}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm" htmlFor="etichetta">
          {t("coperto.etichetta")}
        </label>
        <input
          id="etichetta"
          name="etichetta"
          defaultValue={etichetta ?? ""}
          placeholder={t("coperto.etichetta.placeholder")}
          className={CAMPO}
        />
      </div>

      <p className="text-xs text-muted">{t("coperto.nota")}</p>

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
