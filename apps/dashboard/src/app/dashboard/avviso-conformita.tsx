"use client";

import { useState, useTransition } from "react";
import { accettaDpa } from "./conformita-actions";

/**
 * Avviso di conformità in cima al gestionale.
 *
 * Compare solo quando manca qualcosa di realmente bloccante: l'accordo art. 28
 * non accettato, oppure i dati del titolare assenti — senza i quali
 * l'informativa mostrata ai clienti non nomina nessuno e non è conforme
 * all'art. 13.1.a. Un avviso che compare sempre viene ignorato sempre.
 */
export function AvvisoConformita({
  serveDpa,
  datiMancanti,
}: {
  serveDpa: boolean;
  datiMancanti: string[];
}) {
  const [pending, start] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);

  if (!serveDpa && datiMancanti.length === 0) return null;

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="mx-auto max-w-4xl space-y-2">
        {serveDpa && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              Per trattare i dati dei tuoi clienti serve un accordo scritto fra
              te, che ne sei titolare, e noi che li trattiamo per tuo conto.{" "}
              <a href="/dpa" className="underline underline-offset-2">
                Leggi la nomina a responsabile
              </a>
              .
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setErrore(null);
                start(async () => {
                  const r = await accettaDpa();
                  if (r?.error) setErrore(r.error);
                });
              }}
              className="min-h-11 shrink-0 rounded-full bg-amber-900 px-5 text-sm font-medium text-amber-50 disabled:opacity-60"
            >
              {pending ? "Registro…" : "Accetto"}
            </button>
          </div>
        )}

        {datiMancanti.length > 0 && (
          <p>
            L&apos;informativa privacy mostrata ai tuoi clienti è incompleta:
            manca {datiMancanti.join(", ")}.{" "}
            <a
              href="/dashboard/settings"
              className="underline underline-offset-2"
            >
              Completa i dati del locale
            </a>
            .
          </p>
        )}

        {errore && <p className="font-medium">{errore}</p>}
      </div>
    </div>
  );
}
