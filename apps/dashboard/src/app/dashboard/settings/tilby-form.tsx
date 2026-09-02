"use client";

import { useActionState } from "react";
import { connectTilby, disconnectTilby, type TilbyResult } from "./tilby-actions";

export function TilbyForm({ shopName }: { shopName: string | null }) {
  const [state, formAction, pending] = useActionState<TilbyResult | null, FormData>(
    async (_prev, formData) =>
      formData.get("disconnect") === "1" ? disconnectTilby() : connectTilby(formData),
    null
  );

  const connected = shopName && !state?.disconnected;

  return (
    <form action={formAction} className="space-y-2">
      {connected ? (
        <>
          <p className="text-sm text-success">Collegato al negozio &quot;{shopName}&quot;.</p>
          <input type="hidden" name="disconnect" value="1" />
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-full border border-border px-5 text-sm disabled:opacity-50"
          >
            {pending ? "..." : "Scollega Tilby"}
          </button>
        </>
      ) : (
        <>
          <input
            name="token"
            type="password"
            placeholder="Token Tilby del tuo negozio"
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground disabled:opacity-50"
          >
            {pending ? "Verifica..." : "Collega Tilby"}
          </button>
        </>
      )}

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.shopName && (
        <p className="text-sm text-success">Collegato a &quot;{state.shopName}&quot;.</p>
      )}
    </form>
  );
}
