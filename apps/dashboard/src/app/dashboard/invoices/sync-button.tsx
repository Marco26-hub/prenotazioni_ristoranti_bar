"use client";

import { useTransition } from "react";
import { syncInvoice } from "./actions";

export function SyncButton({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void syncInvoice(invoiceId))}
      className="min-h-11 rounded-full border border-border px-4 text-sm font-medium hover:bg-background disabled:opacity-50"
    >
      {pending ? "Aggiorno…" : "Aggiorna stato"}
    </button>
  );
}
