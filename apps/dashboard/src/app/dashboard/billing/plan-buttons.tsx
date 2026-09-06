"use client";

import { useState, useTransition } from "react";
import { PLANS, setupCents, TRIAL_DAYS } from "@repo/shared";
import { startSubscription, openBillingPortal } from "./actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tSoldi } from "@/i18n/soldi";

export function PlanButtons({
  hasSubscription,
  neverSubscribed,
}: {
  hasSubscription: boolean;
  neverSubscribed: boolean;
}) {
  const t = tSoldi(useLingua());
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<"month" | "year">("month");

  /*
   * Nome, descrizione e nota del piano si prendono dalla famiglia — la parte
   * prima del trattino della chiave — e non da `plans.ts`, che è condiviso e
   * scritto in italiano. La chiave salvata sul locale e mandata a Stripe
   * resta quella: qui cambia solo quello che si legge.
   */
  const NOME: Record<string, string> = {
    ordini: t("piano.ordini.nome"),
    prenotazioni: t("piano.prenotazioni.nome"),
    completo: t("piano.completo.nome"),
  };
  const DESCRIZIONE: Record<string, string> = {
    ordini: t("piano.ordini.descrizione"),
    prenotazioni: t("piano.prenotazioni.descrizione"),
    completo: t("piano.completo.descrizione"),
  };
  const NOTA_MENSILE: Record<string, string> = {
    ordini: t("piano.nota.disdetta"),
    prenotazioni: t("piano.nota.senza_sala"),
    completo: t("piano.nota.risparmio"),
  };

  // Il redirect avviene qui e non lato server perché la Server Action è
  // invocata da un bottone: un redirect() server-side dentro una action
  // chiamata così porterebbe l'utente fuori dalla dashboard senza poter
  // mostrare l'errore se Stripe rifiuta.
  function go(fn: () => Promise<{ url?: string; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else if (res.url) window.location.href = res.url;
    });
  }

  return (
    <div className="space-y-3">
      {hasSubscription ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => go(openBillingPortal)}
          className="min-h-12 w-full rounded-full bg-accent font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? t("abbonamento.apertura") : t("abbonamento.gestisci")}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-1">
            {(["month", "year"] as const).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPeriodo(i)}
                className={`flex min-h-11 flex-1 items-center justify-center rounded-full text-sm ${
                  periodo === i
                    ? "bg-accent text-accent-foreground"
                    : "border border-border text-muted"
                }`}
              >
                {i === "month" ? t("abbonamento.mensile") : t("abbonamento.annuale")}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {PLANS.filter((p) => p.interval === periodo).map((plan) => {
              const famiglia = plan.key.split("-")[0];
              const nota =
                plan.interval === "year"
                  ? t("piano.nota.due_mesi")
                  : NOTA_MENSILE[famiglia];
              return (
                <button
                  key={plan.key}
                  type="button"
                  disabled={pending}
                  onClick={() => go(() => startSubscription(plan.key))}
                  className="flex flex-col items-start rounded-xl border border-accent p-4 text-left disabled:opacity-60"
                >
                  <span className="text-sm font-medium">
                    {NOME[famiglia] ?? plan.label}
                  </span>
                  <span className="mt-1 text-2xl font-semibold tabular-nums">
                    {t.prezzo(plan.amountCents)}
                  </span>
                  <span className="text-xs text-muted">
                    {plan.interval === "year"
                      ? t("piano.cadenza.anno")
                      : t("piano.cadenza.mese")}
                  </span>
                  <span className="mt-2 text-xs leading-relaxed text-muted">
                    {DESCRIZIONE[famiglia] ?? plan.descrizione}
                  </span>
                  {nota && (
                    <span className="mt-2 text-xs font-medium text-accent">{nota}</span>
                  )}
                  {/* L'attivazione va detta prima del Checkout: scoprirla alla
                      pagina di pagamento fa abbandonare. */}
                  <span className="mt-2 text-xs text-muted">
                    {t("abbonamento.attivazione", {
                      prezzo: t.prezzo(setupCents(plan)),
                    })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {neverSubscribed && !hasSubscription && (
        <p className="text-sm text-muted">
          {t("abbonamento.prova", { giorni: TRIAL_DAYS })}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
