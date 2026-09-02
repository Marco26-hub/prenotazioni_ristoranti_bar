"use client";

import { useActionState } from "react";
import { addStaff, type StaffResult } from "./actions";

export function AddStaffForm() {
  const [state, formAction, pending] = useActionState<StaffResult | null, FormData>(
    async (_prev, formData) => addStaff(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-2">
      <input
        name="name"
        placeholder="Nome (facoltativo)"
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
      />
      <input
        name="password"
        type="password"
        placeholder="Password iniziale (min 8 caratteri)"
        required
        minLength={8}
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
      />
      <select
        name="role"
        defaultValue="waiter"
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
      >
        <option value="waiter">Sala</option>
        <option value="kitchen">Cucina</option>
        <option value="manager">Responsabile</option>
        <option value="owner">Titolare</option>
      </select>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.createdEmail && (
        <p className="text-sm text-success">
          Accesso creato per {state.createdEmail}. Comunicagli la password.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground disabled:opacity-50"
      >
        {pending ? "Creazione..." : "Crea accesso"}
      </button>
    </form>
  );
}
