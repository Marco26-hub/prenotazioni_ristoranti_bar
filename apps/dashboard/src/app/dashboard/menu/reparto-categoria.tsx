"use client";

import { useState, useTransition } from "react";
import { impostaRepartoCategoria } from "./reparti-actions";

/**
 * Dove si prepara questa categoria.
 *
 * Il modello di formato la assegna, ma è un punto di partenza: chi ha il
 * forno separato dalla friggitoria, o due cucine, la sposta. Prima era
 * decisa dal modello e non si poteva più toccare.
 */
export function RepartoCategoria({
  categoryId,
  valore,
  reparti,
  nomeCategoria,
}: {
  categoryId: string;
  valore: string;
  reparti: { chiave: string; etichetta: string }[];
  nomeCategoria: string;
}) {
  const [scelto, setScelto] = useState(valore);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <select
        value={scelto}
        disabled={pending}
        aria-label={`Dove si prepara ${nomeCategoria}`}
        onChange={(e) => {
          const chiave = e.target.value;
          const prima = scelto;
          setScelto(chiave);
          start(async () => {
            const r = await impostaRepartoCategoria(categoryId, chiave);
            setAvviso(r.error ?? null);
            if (r.error) setScelto(prima);
          });
        }}
        className="min-h-9 rounded-lg border border-border bg-background px-2 text-xs"
      >
        {reparti.map((r) => (
          <option key={r.chiave} value={r.chiave}>
            {r.etichetta}
          </option>
        ))}
      </select>
      {avviso && <span className="text-xs text-danger">{avviso}</span>}
    </span>
  );
}
