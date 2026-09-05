"use client";

import { useActionState, useState } from "react";
import { salvaRitiro, type EsitoRitiro } from "./ritiro-actions";

const METODI: Array<[string, string, string]> = [
  [
    "segnaposto",
    "Segnaposto numerato",
    "Il cliente porta al tavolo un cavalierino col numero. Al banco vedi quale chiamare.",
  ],
  [
    "cercapersone",
    "Cercapersone",
    "Il disco che vibra quando è pronto. Il banco ti dice quale far suonare.",
  ],
  [
    "telefono",
    "Avviso sul telefono",
    "Chi ha ordinato dal QR vede il proprio numero diventare «pronto» da solo, senza stare in piedi davanti al bancone.",
  ],
];

/**
 * Numeri di ritiro: acceso o spento, e con quali modi di avvisare.
 *
 * I modi si spuntano insieme perché nella pratica si sommano: si consegna un
 * segnaposto e si avvisa anche sul telefono, per chi si è seduto fuori.
 */
export function RitiroForm({
  attivo,
  metodi,
  alBanco,
}: {
  attivo: boolean;
  metodi: string[];
  alBanco: boolean;
}) {
  const [state, azione, pending] = useActionState<EsitoRitiro | null, FormData>(
    async (_prec, formData) => salvaRitiro(formData),
    null
  );
  const [acceso, setAcceso] = useState(attivo);

  return (
    <form action={azione} className="space-y-3">
      <label className="flex gap-2 rounded-lg border border-border p-3 text-sm">
        <input
          type="checkbox"
          name="alBanco"
          defaultChecked={alBanco}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          <span className="font-medium">Si consegna al bancone</span>
          <span className="mt-0.5 block text-xs text-muted">
            Piadineria, pizza al taglio, gastronomia: la gente si siede dove
            capita, o non si siede affatto. Ogni cliente che inquadra il QR
            apre un conto suo — al tavolo invece il conto si condivide, e con
            un QR solo al bancone la piadina del secondo finirebbe sul conto
            del primo. La pagina principale diventa il Banco.
          </span>
        </span>
      </label>

      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="attivo"
          defaultChecked={attivo}
          onChange={(e) => setAcceso(e.target.checked)}
          className="h-4 w-4"
        />
        Dai un numero a ogni ordine
      </label>

      {acceso && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Come avvisi chi aspetta
          </legend>
          {METODI.map(([chiave, titolo, spiegazione]) => (
            <label
              key={chiave}
              className="flex gap-2 rounded-lg border border-border p-3 text-sm"
            >
              <input
                type="checkbox"
                name={`metodo-${chiave}`}
                defaultChecked={metodi.includes(chiave)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>
                <span className="font-medium">{titolo}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {spiegazione}
                </span>
              </span>
            </label>
          ))}
          <p className="text-xs text-muted">
            Puoi sceglierne più d&apos;uno: molti consegnano il segnaposto e
            avvisano anche sul telefono, per chi si è seduto fuori e il numero
            sul tavolo non lo vede nessuno.
          </p>
        </fieldset>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Salvo…" : "Salva"}
      </button>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}
    </form>
  );
}
