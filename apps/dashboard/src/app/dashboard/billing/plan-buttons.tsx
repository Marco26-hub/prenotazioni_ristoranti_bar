"use client";

import { useState, useTransition } from "react";
import { PLANS, formatPriceCents, TRIAL_DAYS } from "@repo/shared";
import { startSubscription, openBillingPortal } from "./actions";

export function PlanButtons({
  hasSubscription,
  neverSubscribed,
}: {
  hasSubscription: boolean;
  neverSubscribed: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
          {pending ? "Apertura…" : "Gestisci abbonamento e fatture"}
        </button>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <button
              key={plan.key}
              type="button"
              disabled={pending}
              onClick={() => go(() => startSubscription(plan.key))}
              className="flex min-h-24 flex-col items-start justify-center rounded-xl border border-accent px-4 py-3 text-left disabled:opacity-60"
            >
              <span className="text-sm text-muted">{plan.label}</span>
              <span className="text-xl font-semibold tabular-nums">
                {formatPriceCents(plan.amountCents, "EUR")}
                <span className="text-sm font-normal text-muted"> {plan.cadence}</span>
              </span>
              {plan.note && <span className="mt-1 text-xs text-muted">{plan.note}</span>}
            </button>
          ))}
        </div>
      )}

      {neverSubscribed && !hasSubscription && (
        <p className="text-sm text-muted">
          Primi {TRIAL_DAYS} giorni gratuiti. Non viene addebitato nulla se
          disdici prima della scadenza.
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
