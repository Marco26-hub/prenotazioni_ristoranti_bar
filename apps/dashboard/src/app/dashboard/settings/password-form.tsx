"use client";

import { useActionState } from "react";
import { changeOwnPassword, type PasswordResult } from "./password-actions";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordResult | null, FormData>(
    async (_prev, formData) => changeOwnPassword(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-2">
      <input
        name="currentPassword"
        type="password"
        placeholder="Password attuale"
        required
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
      />
      <input
        name="newPassword"
        type="password"
        placeholder="Nuova password (min 8 caratteri)"
        required
        minLength={8}
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
      />
      <input
        name="confirmPassword"
        type="password"
        placeholder="Ripeti nuova password"
        required
        minLength={8}
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
      />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">Password aggiornata.</p>}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-50"
      >
        {pending ? "Salvataggio..." : "Cambia password"}
      </button>
    </form>
  );
}
