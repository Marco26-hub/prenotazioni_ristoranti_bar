"use client";

import { useState } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tImpostazioni } from "@/i18n/impostazioni";

export function ConnectStripeButton({ label }: { label: string }) {
  const t = tImpostazioni(useLingua());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? t("stripe.errore.avvio"));
        setLoading(false);
        return;
      }
      // `assign` e non `location.href = …`: stessa navigazione, ma non è
      // l'assegnazione a una variabile esterna che il compilatore rifiuta.
      window.location.assign(data.url);
    } catch {
      setError(t("stripe.errore.rete"));
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        {loading ? t("stato.attendere_punti") : label}
      </button>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
