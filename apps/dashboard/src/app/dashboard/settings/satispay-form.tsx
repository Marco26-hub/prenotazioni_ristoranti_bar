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
        className="w-full rounded border p-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
      >
        {pending ? "Attivazione..." : "Connetti Satispay"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-700">Satispay connesso.</p>}
    </form>
  );
}
