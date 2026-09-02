"use client";

import { useActionState } from "react";
import { connectSatispay } from "./satispay-actions";

type FormState = { error?: string; success?: boolean } | null;

export function SatispayForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => connectSatispay(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-2">
      <input
        name="activationToken"
        placeholder="Codice attivazione (dalla Dashboard Satispay Business)"
        required
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-50"
      >
        {pending ? "Attivazione..." : "Connetti Satispay"}
      </button>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">Satispay connesso.</p>}
    </form>
  );
}
