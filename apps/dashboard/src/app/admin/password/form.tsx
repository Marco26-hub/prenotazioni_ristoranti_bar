"use client";

import { useActionState } from "react";
import { cambiaPasswordAdmin } from "../actions";

const CAMPO =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

export function CambiaPasswordForm() {
  const [stato, azione, pending] = useActionState<
    { ok?: string; error?: string } | null,
    FormData
  >(async (_p, fd) => cambiaPasswordAdmin(fd), null);

  return (
    <form action={azione} className="space-y-3">
      <label className="block text-sm">
        Nuova password
        <input type="password" name="nuova" required autoComplete="new-password" className={`${CAMPO} mt-1`} />
      </label>
      <label className="block text-sm">
        Ripetila
        <input type="password" name="conferma" required autoComplete="new-password" className={`${CAMPO} mt-1`} />
      </label>
      <p className="text-xs text-muted">
        Almeno 12 caratteri, con lettere, numeri e un simbolo.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Salvo…" : "Salva password"}
      </button>
      {stato?.ok && <p className="text-sm text-success">{stato.ok}</p>}
      {stato?.error && <p role="alert" className="text-sm text-danger">{stato.error}</p>}
    </form>
  );
}
