"use client";

import { useActionState, useState } from "react";
import { salvaMittenteEmail, type EsitoEmailLocale } from "./email-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tImpostazioni } from "@/i18n/impostazioni";
import { tComune } from "@repo/shared/i18n/comune";

const CAMPO = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

export function EmailForm({
  collegato,
  from,
  piattaformaAttiva,
}: {
  collegato: boolean;
  from: string | null;
  piattaformaAttiva: boolean;
}) {
  const t = tImpostazioni(useLingua());
  const c = tComune(useLingua());
  const [aperto, setAperto] = useState(false);
  const [state, formAction, pending] = useActionState<EsitoEmailLocale | null, FormData>(
    async (_prev, formData) => salvaMittenteEmail(formData),
    null
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {collegato ? (
          <>
            {t("email.collegato.prima")} <strong>{from}</strong>.
          </>
        ) : piattaformaAttiva ? (
          t("email.piattaforma")
        ) : (
          t("email.non_attivo")
        )}
      </p>

      {!aperto && (
        <button
          type="button"
          onClick={() => setAperto(true)}
          className="flex min-h-11 items-center px-1 text-sm underline"
        >
          {collegato ? t("email.cambia") : t("email.usa_dominio")}
        </button>
      )}

      {aperto && (
        <form action={formAction} className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm text-muted">
            {t("email.serve.prima")} <strong>resend.com</strong>{" "}
            {t("email.serve.dopo")}
          </p>

          <div>
            <label className="mb-1 block text-sm" htmlFor="resend-from">
              {t("email.mittente")}
            </label>
            <input
              id="resend-from"
              name="from"
              type="email"
              defaultValue={from ?? ""}
              placeholder={t("email.mittente.placeholder")}
              className={CAMPO}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm" htmlFor="resend-key">
              {t("email.chiave")}
            </label>
            <input
              id="resend-key"
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder="re_..."
              className={CAMPO}
            />
            <p className="mt-1 text-xs text-muted">{t("email.chiave.nota")}</p>
          </div>

          {collegato && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="rimuovi" className="h-5 w-5" />
              {t("email.rimuovi")}
            </label>
          )}

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          {state?.success && <p className="text-sm text-success">{state.success}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {pending ? t("stato.verifico") : t("email.salva_prova")}
            </button>
            <button
              type="button"
              onClick={() => setAperto(false)}
              className="flex min-h-11 items-center px-3 text-sm underline"
            >
              {c("azione.chiudi")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
