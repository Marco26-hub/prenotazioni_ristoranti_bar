"use client";

import { useActionState } from "react";
import { cambiaPassword } from "./actions";

const CAMPO = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

export function CambiaForm() {
  const [stato, azione, pending] = useActionState<{ error?: string } | null, FormData>(
    async (_p, fd) => cambiaPassword(fd),
    null
  );

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
      <p className="text-xs text-muted">Almeno 10 caratteri, non solo numeri.</p>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Salvo…" : "Salva e entra"}
      </button>
      {stato?.error && <p role="alert" className="text-sm text-danger">{stato.error}</p>}
    </form>
  );
}
