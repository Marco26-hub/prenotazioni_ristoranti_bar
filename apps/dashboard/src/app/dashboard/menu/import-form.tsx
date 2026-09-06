"use client";

import { useActionState } from "react";
import { importMenuCsv, type ImportResult } from "./import-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tMenuAdmin } from "@/i18n/menu";

export function ImportForm() {
  const t = tMenuAdmin(useLingua());
  const [state, formAction, pending] = useActionState<ImportResult | null, FormData>(
    async (_prev, formData) => importMenuCsv(formData),
    null
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {t("importa.testo.prima")}
        <strong>{t("importa.testo.excel")}</strong>
        {t("importa.testo.dopo")}
      </p>

      <a
        href="/menu-esempio.csv"
        download
        className="inline-block text-sm underline underline-offset-2"
      >
        {t("importa.esempio")}
      </a>

      <form action={formAction} className="space-y-2">
        <input
          name="file"
          type="file"
          accept=".csv,.tsv,.txt,.xlsx,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          className="w-full text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-50"
        >
          {pending ? t("importa.in.corso") : t("importa.avvia")}
        </button>
      </form>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      {state?.imported !== undefined && (
        <div className="space-y-1 text-sm">
          <p className="text-success">
            {t("importa.fatti", { n: state.imported })}
          </p>
          {state.skipped && state.skipped.length > 0 && (
            <div className="text-muted">
              <p>{t("importa.saltate")}</p>
              <ul className="list-disc pl-5">
                {state.skipped.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
