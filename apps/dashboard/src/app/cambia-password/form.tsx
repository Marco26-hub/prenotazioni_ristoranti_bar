"use client";

import { useActionState } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tGuscio } from "@/i18n/guscio";
import { cambiaPassword } from "./actions";

const CAMPO = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

export function CambiaForm() {
  const t = tGuscio(useLingua());
  const [stato, azione, pending] = useActionState<{ error?: string } | null, FormData>(
    async (_p, fd) => cambiaPassword(fd),
    null
  );

  return (
    <form action={azione} className="space-y-3">
      <label className="block text-sm">
        {t("primaccesso.nuova")}
        <input type="password" name="nuova" required autoComplete="new-password" className={`${CAMPO} mt-1`} />
      </label>
      <label className="block text-sm">
        {t("primaccesso.ripeti")}
        <input type="password" name="conferma" required autoComplete="new-password" className={`${CAMPO} mt-1`} />
      </label>
      <p className="text-xs text-muted">{t("primaccesso.regola")}</p>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? t("primaccesso.salvo") : t("primaccesso.salva")}
      </button>
      {stato?.error && <p role="alert" className="text-sm text-danger">{stato.error}</p>}
    </form>
  );
}
