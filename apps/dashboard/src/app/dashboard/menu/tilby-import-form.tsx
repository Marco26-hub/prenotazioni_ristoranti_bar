"use client";

import { useActionState } from "react";
import { importMenuFromTilby, type TilbyImportResult } from "./tilby-import-actions";

export function TilbyImportForm({ connected }: { connected: boolean }) {
  const [state, formAction, pending] = useActionState<TilbyImportResult | null, FormData>(
    async () => importMenuFromTilby(),
    null
  );

  if (!connected) {
    return (
      <p className="text-sm text-muted">
        Collega il tuo gestionale di cassa in <strong>Impostazioni</strong> per
        importare il menu che hai già, con prezzi e IVA corretti.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <p className="text-sm text-muted">
        Riallinea il menu a quello in cassa: aggiorna prezzi e disponibilità dei
        piatti già presenti e aggiunge i nuovi. Non cancella nulla.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground disabled:opacity-50"
      >
        {pending ? "Importazione da Tilby..." : "Importa da Tilby"}
      </button>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.created !== undefined && (
        <div className="space-y-1 text-sm">
          <p className="text-success">
            {state.created} piatti aggiunti, {state.updated} aggiornati.
          </p>
          {state.skipped && state.skipped.length > 0 && (
            <ul className="list-disc pl-5 text-muted">
              {state.skipped.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
