"use client";

import { useActionState } from "react";
import { salvaCoperto, type EsitoCoperto } from "./coperto-actions";

const CAMPO = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

export function CopertoForm({
  copertoCents,
  servizio,
  etichetta,
}: {
  copertoCents: number;
  servizio: number;
  etichetta: string | null;
}) {
  const [state, formAction, pending] = useActionState<EsitoCoperto | null, FormData>(
    async (_prev, formData) => salvaCoperto(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm" htmlFor="coperto">
            Coperto a persona (€)
          </label>
          <input
            id="coperto"
            name="coperto"
            type="number"
            step="0.01"
            min="0"
            max="50"
            defaultValue={(copertoCents / 100).toFixed(2)}
            className={CAMPO}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm" htmlFor="servizio">
            Servizio (%)
          </label>
          <input
            id="servizio"
            name="servizio"
            type="number"
            step="0.1"
            min="0"
            max="30"
            defaultValue={servizio}
            className={CAMPO}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm" htmlFor="etichetta">
          Come si chiama in conto
        </label>
        <input
          id="etichetta"
          name="etichetta"
          defaultValue={etichetta ?? ""}
          placeholder="Coperto · Pane e coperto · Servizio"
          className={CAMPO}
        />
      </div>

      <p className="text-xs text-muted">
        Il coperto si moltiplica per i coperti indicati dallo staff sulla
        scheda del tavolo. Il servizio si calcola sull&apos;ordinato, non sul
        coperto. Entrambi compaiono al cliente già sul menu: la legge li
        tratta come una voce di prezzo, non come una sorpresa in fondo al
        conto.
      </p>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground disabled:opacity-50"
      >
        {pending ? "Salvataggio…" : "Salva"}
      </button>
    </form>
  );
}
