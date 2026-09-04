"use client";

import { useState, useTransition } from "react";
import { syncInvoice } from "./actions";

/**
 * Chiede all'intermediario com'è andata la trasmissione allo SDI.
 *
 * L'esito veniva buttato via con un `void`: se la richiesta falliva — chiave
 * sbagliata, intermediario giù — il bottone smetteva di girare e non
 * cambiava niente, quindi si premeva di nuovo. Una fattura che non risulta
 * consegnata è un problema fiscale, e il primo passo per risolverlo è sapere
 * che il controllo non è riuscito.
 */
export function SyncButton({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  const [avviso, setAvviso] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setAvviso(null);
            try {
              const r = await syncInvoice(invoiceId);
              if (r?.error) setAvviso(r.error);
            } catch {
              setAvviso("Controllo non riuscito: riprova fra poco.");
            }
          })
        }
        className="min-h-11 rounded-full border border-border px-4 text-sm font-medium hover:bg-background disabled:opacity-50"
      >
        {pending ? "Aggiorno…" : "Aggiorna stato"}
      </button>
      {avviso && (
        <span role="alert" className="text-sm text-danger">
          {avviso}
        </span>
      )}
    </span>
  );
}
