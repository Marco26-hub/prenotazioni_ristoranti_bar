"use client";

import { useActionState, useState } from "react";
import { salvaRitiro, type EsitoRitiro } from "./ritiro-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tImpostazioni } from "@/i18n/impostazioni";
import { tComune } from "@repo/shared/i18n/comune";

const METODI = ["segnaposto", "cercapersone", "telefono"] as const;

/**
 * Numeri di ritiro: acceso o spento, e con quali modi di avvisare.
 *
 * I modi si spuntano insieme perché nella pratica si sommano: si consegna un
 * segnaposto e si avvisa anche sul telefono, per chi si è seduto fuori.
 */
export function RitiroForm({
  attivo,
  metodi,
  alBanco,
}: {
  attivo: boolean;
  metodi: string[];
  alBanco: boolean;
}) {
  const t = tImpostazioni(useLingua());
  const c = tComune(useLingua());
  const [state, azione, pending] = useActionState<EsitoRitiro | null, FormData>(
    async (_prec, formData) => salvaRitiro(formData),
    null
  );
  const [acceso, setAcceso] = useState(attivo);

  return (
    <form action={azione} className="space-y-3">
      <label className="flex gap-2 rounded-lg border border-border p-3 text-sm">
        <input
          type="checkbox"
          name="alBanco"
          defaultChecked={alBanco}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          <span className="font-medium">{t("ritiro.banco.titolo")}</span>
          <span className="mt-0.5 block text-xs text-muted">
            {t("ritiro.banco.nota")}
          </span>
        </span>
      </label>

      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="attivo"
          defaultChecked={attivo}
          onChange={(e) => setAcceso(e.target.checked)}
          className="h-4 w-4"
        />
        {t("ritiro.numero")}
      </label>

      {acceso && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            {t("ritiro.come")}
          </legend>
          {METODI.map((chiave) => (
            <label
              key={chiave}
              className="flex gap-2 rounded-lg border border-border p-3 text-sm"
            >
              <input
                type="checkbox"
                name={`metodo-${chiave}`}
                defaultChecked={metodi.includes(chiave)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>
                <span className="font-medium">
                  {t(`ritiro.metodo.${chiave}`)}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {t(`ritiro.metodo.${chiave}.nota`)}
                </span>
              </span>
            </label>
          ))}
          <p className="text-xs text-muted">{t("ritiro.piu.nota")}</p>
        </fieldset>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? t("stato.salvo") : c("azione.salva")}
      </button>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}
    </form>
  );
}
