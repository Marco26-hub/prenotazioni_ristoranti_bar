"use client";

import { useActionState } from "react";
import { apriTicket } from "../assistenza-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tPersone } from "@/i18n/persone";

const CAMPO = "w-full rounded-lg border border-border bg-background px-3 text-sm";

export function ChiediAssistenza() {
  const t = tPersone(useLingua());
  const [stato, azione, pending] = useActionState<
    { ok?: string; error?: string } | null,
    FormData
  >(async (_p, fd) => apriTicket(fd), null);

  return (
    <form action={azione} className="space-y-3">
      <label className="block text-sm">
        {t("assistenza.oggetto")}
        <input
          name="oggetto"
          required
          maxLength={120}
          placeholder={t("assistenza.oggetto.placeholder")}
          className={`${CAMPO} mt-1 min-h-11`}
        />
      </label>
      <label className="block text-sm">
        {t("assistenza.messaggio")}
        <textarea
          name="messaggio"
          required
          rows={4}
          maxLength={4000}
          placeholder={t("assistenza.messaggio.placeholder")}
          className={`${CAMPO} mt-1 py-2`}
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="urgenza" value="blocca_servizio" className="h-4 w-4" />
        {t("assistenza.urgenza")}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? t("assistenza.invio") : t("assistenza.invia")}
      </button>
      {stato?.ok && <p role="status" className="text-sm text-success">{stato.ok}</p>}
      {stato?.error && <p role="alert" className="text-sm text-danger">{stato.error}</p>}
    </form>
  );
}
