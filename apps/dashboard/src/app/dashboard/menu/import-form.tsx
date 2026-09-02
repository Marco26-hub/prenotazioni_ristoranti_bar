"use client";

import { useActionState } from "react";
import { importMenuCsv, type ImportResult } from "./import-actions";

export function ImportForm() {
  const [state, formAction, pending] = useActionState<ImportResult | null, FormData>(
    async (_prev, formData) => importMenuCsv(formData),
    null
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Carica un file <strong>Excel (.xlsx)</strong>, CSV o TSV con una riga per
        piatto, in questo ordine:{" "}
        <strong>categoria, nome, prezzo, descrizione, IVA</strong>. Descrizione e
        IVA sono facoltative (IVA predefinita 10%). Le categorie che non esistono
        vengono create da sole.
      </p>

      <a
        href="/menu-esempio.csv"
        download
        className="inline-block text-sm underline underline-offset-2"
      >
        Scarica un file di esempio
      </a>

      <form action={formAction} className="space-y-2">
        <input
          name="file"
          type="file"
          accept=".csv,.tsv,.txt,.xlsx,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          className="w-full text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-50"
        >
          {pending ? "Importazione..." : "Importa menu"}
        </button>
      </form>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      {state?.imported !== undefined && (
        <div className="space-y-1 text-sm">
          <p className="text-success">
            {state.imported} piatti importati.
          </p>
          {state.skipped && state.skipped.length > 0 && (
            <div className="text-muted">
              <p>Righe saltate:</p>
              <ul className="list-disc pl-5">
                {state.skipped.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
