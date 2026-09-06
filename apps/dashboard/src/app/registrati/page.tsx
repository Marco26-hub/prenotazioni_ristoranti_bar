"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type SignupResult } from "./actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tGuscio } from "@/i18n/guscio";

export default function SignupPage() {
  const t = tGuscio(useLingua());
  const [state, formAction, pending] = useActionState<SignupResult | null, FormData>(
    async (_prev, formData) => signup(formData),
    null
  );

  if (state?.success) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-4">
        <h1 className="text-lg font-semibold">{t("registrazione.fatto.titolo")}</h1>
        <p className="text-sm">{t("registrazione.fatto.testo")}</p>
        <Link href="/login" className="rounded bg-black py-2 text-center text-white">
          {t("registrazione.fatto.vai")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10">
      <div className="rounded-2xl border border-border bg-surface p-6">
      <h1 className="mb-1 text-xl font-semibold tracking-tight">{t("registrazione.titolo")}</h1>
      <p className="mb-6 text-sm text-muted">{t("registrazione.sottotitolo")}</p>

      <form action={formAction} className="space-y-3">
        <input
          name="venueName"
          placeholder={t("registrazione.nome")}
          required
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
        />
        <input
          name="email"
          type="email"
          placeholder={t("registrazione.email")}
          required
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
        />
        <input
          name="password"
          type="password"
          placeholder={t("registrazione.password")}
          required
          minLength={8}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
        />
        <div>
          <label className="mb-1 block text-sm">{t("registrazione.tavoli")}</label>
          <input
            name="tableCount"
            type="number"
            min="1"
            max="200"
            defaultValue={10}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <p className="mt-1 text-xs text-muted">{t("registrazione.tavoli.nota")}</p>
        </div>

        {/* L'accordo art. 28 va accettato prima che esista un trattamento,
            non dopo: senza, i dati dei clienti del locale sarebbero trattati
            da noi senza alcun atto scritto fra titolare e responsabile. */}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="dpa"
            required
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <span>
            {t("registrazione.dpa.prima")}{" "}
            <a
              href="/dpa"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {t("registrazione.dpa.nomina")}
            </a>{" "}
            {t("registrazione.dpa.mezzo")}
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {t("registrazione.dpa.privacy")}
            </a>
            {t("registrazione.dpa.dopo")}
          </span>
        </label>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-50"
        >
          {pending ? t("registrazione.in_corso") : t("registrazione.crea")}
        </button>
      </form>

      <Link href="/login" className="mt-5 block text-center text-sm text-muted underline">
        {t("registrazione.gia")}
      </Link>
      </div>
    </main>
  );
}
