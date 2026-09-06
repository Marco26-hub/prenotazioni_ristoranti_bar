"use client";

import { useState, useTransition } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tGuscio } from "@/i18n/guscio";
import { accettaDpa } from "./conformita-actions";

/**
 * Avviso di conformità in cima al gestionale.
 *
 * Compare solo quando manca qualcosa di realmente bloccante: l'accordo art. 28
 * non accettato, oppure i dati del titolare assenti — senza i quali
 * l'informativa mostrata ai clienti non nomina nessuno e non è conforme
 * all'art. 13.1.a. Un avviso che compare sempre viene ignorato sempre.
 *
 * `datiMancanti` arriva già tradotto dal layout, che sa la lingua: qui si
 * traduce solo la frase che li contiene, e l'elenco si compone con
 * `t.elenco` perché in inglese l'ultima virgola diventa "and".
 */
export function AvvisoConformita({
  serveDpa,
  datiMancanti,
}: {
  serveDpa: boolean;
  datiMancanti: string[];
}) {
  const t = tGuscio(useLingua());
  const [pending, start] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);

  if (!serveDpa && datiMancanti.length === 0) return null;

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="mx-auto max-w-4xl space-y-2">
        {serveDpa && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              {t("conformita.dpa.testo")}{" "}
              <a href="/dpa" className="underline underline-offset-2">
                {t("conformita.dpa.link")}
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
              {pending ? t("conformita.dpa.registro") : t("conformita.dpa.accetto")}
            </button>
          </div>
        )}

        {datiMancanti.length > 0 && (
          <p>
            {t.n(datiMancanti.length, "conformita.dati", {
              elenco: t.elenco(datiMancanti),
            })}{" "}
            <a
              href="/dashboard/settings"
              className="underline underline-offset-2"
            >
              {t("conformita.dati.link")}
            </a>
            .
          </p>
        )}

        {errore && <p className="font-medium">{errore}</p>}
      </div>
    </div>
  );
}
