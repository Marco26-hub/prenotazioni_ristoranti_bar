"use client";

import { useState } from "react";

export function ConnectStripeButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    const res = await fetch("/api/stripe/connect", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
    >
      {loading ? "Attendere..." : label}
    </button>
  );
}
