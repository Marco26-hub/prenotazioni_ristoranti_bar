"use client";

import { useActionState } from "react";
import { addStaff, type StaffResult } from "./actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tPersone } from "@/i18n/persone";

export function AddStaffForm() {
  const t = tPersone(useLingua());
  const [state, formAction, pending] = useActionState<StaffResult | null, FormData>(
    async (_prev, formData) => addStaff(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-2">
      <input
        name="name"
        placeholder={t("aggiungi.nome")}
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
      />
      <input
        name="email"
        type="email"
        placeholder={t("aggiungi.email")}
        required
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
      />
      <input
        name="password"
        type="password"
        placeholder={t("aggiungi.password")}
        required
        minLength={8}
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
      />
      <select
        name="role"
        defaultValue="waiter"
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
      >
        <option value="waiter">{t("ruolo.waiter")}</option>
        <option value="kitchen">{t("ruolo.kitchen")}</option>
        <option value="manager">{t("ruolo.manager")}</option>
        <option value="owner">{t("ruolo.owner")}</option>
      </select>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.createdEmail && (
        <p className="text-sm text-success">
          {t("aggiungi.creato", { email: state.createdEmail })}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground disabled:opacity-50"
      >
        {pending ? t("aggiungi.creazione") : t("aggiungi.crea")}
      </button>
    </form>
  );
}
