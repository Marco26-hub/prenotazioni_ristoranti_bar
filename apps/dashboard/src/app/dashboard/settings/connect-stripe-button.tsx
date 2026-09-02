"use client";

import { useState } from "react";

export function ConnectStripeButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Errore avvio connessione Stripe");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Connessione assente — riprova.");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {loading ? "Attendere..." : label}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
