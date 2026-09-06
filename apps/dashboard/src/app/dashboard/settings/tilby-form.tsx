"use client";

import { useActionState } from "react";
import { connectTilby, disconnectTilby, type TilbyResult } from "./tilby-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tImpostazioni } from "@/i18n/impostazioni";

export function TilbyForm({ shopName }: { shopName: string | null }) {
  const t = tImpostazioni(useLingua());
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
          <p className="text-sm text-success">{t("tilby.collegato", { negozio: shopName })}</p>
          <input type="hidden" name="disconnect" value="1" />
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-full border border-border px-5 text-sm disabled:opacity-50"
          >
            {pending ? "..." : t("tilby.scollega")}
          </button>
        </>
      ) : (
        <>
          <input
            name="token"
            type="password"
            placeholder={t("tilby.token.placeholder")}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground disabled:opacity-50"
          >
            {pending ? t("stato.verifica_punti") : t("tilby.collega")}
          </button>
        </>
      )}

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.shopName && (
        <p className="text-sm text-success">{t("tilby.collegato.breve", { negozio: state.shopName })}</p>
      )}
    </form>
  );
}
