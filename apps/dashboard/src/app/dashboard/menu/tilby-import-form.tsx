"use client";

import { useActionState } from "react";
import { importMenuFromTilby, type TilbyImportResult } from "./tilby-import-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tMenuAdmin } from "@/i18n/menu";

export function TilbyImportForm({ connected }: { connected: boolean }) {
  const t = tMenuAdmin(useLingua());
  const [state, formAction, pending] = useActionState<TilbyImportResult | null, FormData>(
    async () => importMenuFromTilby(),
    null
  );

  if (!connected) {
    return (
      <p className="text-sm text-muted">
        {t("tilby.non.collegato.prima")}
        <strong>{t("tilby.impostazioni")}</strong>
        {t("tilby.non.collegato.dopo")}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <p className="text-sm text-muted">
        {t("tilby.testo")}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground disabled:opacity-50"
      >
        {pending ? t("tilby.in.corso") : t("tilby.avvia")}
      </button>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.created !== undefined && (
        <div className="space-y-1 text-sm">
          <p className="text-success">
            {t("tilby.fatto", {
              creati: state.created,
              aggiornati: state.updated ?? 0,
            })}
          </p>
          {state.skipped && state.skipped.length > 0 && (
            <ul className="list-disc pl-5 text-muted">
              {state.skipped.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
