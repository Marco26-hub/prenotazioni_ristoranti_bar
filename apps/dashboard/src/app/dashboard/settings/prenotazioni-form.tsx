"use client";

import { useActionState } from "react";
import {
  salvaImpostazioniPrenotazioni,
  type EsitoPrenotazioni,
} from "./prenotazioni-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tImpostazioni } from "@/i18n/impostazioni";
import { tComune } from "@repo/shared/i18n/comune";

const CAMPO = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

export function PrenotazioniForm({
  email,
  capienza,
  autoConfirm,
}: {
  email: string | null;
  capienza: number | null;
  autoConfirm: boolean;
}) {
  const t = tImpostazioni(useLingua());
  const c = tComune(useLingua());
  const [state, formAction, pending] = useActionState<EsitoPrenotazioni | null, FormData>(
    async (_prev, formData) => salvaImpostazioniPrenotazioni(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm" htmlFor="reservationEmail">
          {t("prenotazioni.email")}
        </label>
        <input
          id="reservationEmail"
          name="reservationEmail"
          type="email"
          defaultValue={email ?? ""}
          placeholder={t("prenotazioni.email.placeholder")}
          className={CAMPO}
        />
        <p className="mt-1 text-xs text-muted">{t("prenotazioni.email.nota")}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm" htmlFor="capacity">
          {t("prenotazioni.capienza")}
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min="1"
          max="2000"
          defaultValue={capienza ?? ""}
          placeholder={t("prenotazioni.capienza.placeholder")}
          className={CAMPO}
        />
        <p className="mt-1 text-xs text-muted">{t("prenotazioni.capienza.nota")}</p>
      </div>

      <label className="flex min-h-11 items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="autoConfirm"
          defaultChecked={autoConfirm}
          className="mt-0.5 h-5 w-5"
        />
        <span>
          {t("prenotazioni.auto")}
          <span className="block text-xs text-muted">
            {t("prenotazioni.auto.nota")}
          </span>
        </span>
      </label>

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
