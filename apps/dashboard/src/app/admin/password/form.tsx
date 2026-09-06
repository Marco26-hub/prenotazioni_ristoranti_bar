"use client";

import { useActionState } from "react";
import { cambiaPasswordAdmin } from "../actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tSuperAdmin } from "@/i18n/superadmin";

const CAMPO =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

export function CambiaPasswordForm() {
  const t = tSuperAdmin(useLingua());
  const [stato, azione, pending] = useActionState<
    { ok?: string; error?: string } | null,
    FormData
  >(async (_p, fd) => cambiaPasswordAdmin(fd), null);

  return (
    <form action={azione} className="space-y-3">
      <label className="block text-sm">
        {t("password.nuova")}
        <input type="password" name="nuova" required autoComplete="new-password" className={`${CAMPO} mt-1`} />
      </label>
      <label className="block text-sm">
        {t("password.ripeti")}
        <input type="password" name="conferma" required autoComplete="new-password" className={`${CAMPO} mt-1`} />
      </label>
      <p className="text-xs text-muted">{t("password.regola")}</p>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? t("password.salvataggio") : t("password.salva")}
      </button>
      {stato?.ok && <p className="text-sm text-success">{stato.ok}</p>}
      {stato?.error && <p role="alert" className="text-sm text-danger">{stato.error}</p>}
    </form>
  );
}
