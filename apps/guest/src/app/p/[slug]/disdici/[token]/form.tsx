"use client";

import { useState } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tPrenota } from "@/i18n/prenota";

/**
 * Conferma prima di disdire.
 *
 * Un link che disdice al solo aprirlo verrebbe attivato dalle anteprime di
 * WhatsApp e dagli scanner antivirus delle caselle aziendali: il tavolo
 * sparirebbe senza che nessuno abbia deciso niente.
 */
export function DisdiciForm({ token }: { token: string }) {
  const t = tPrenota(useLingua());
  const [invio, setInvio] = useState(false);
  const [fatto, setFatto] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  if (fatto) {
    return (
      <p
        role="status"
        className="mt-4 rounded-lg border border-success bg-success/10 p-3 text-sm font-medium"
      >
        {t("disdetta.fatta")}
      </p>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={invio}
        onClick={async () => {
          setInvio(true);
          setErrore(null);
          try {
            const res = await fetch("/api/reservations/disdici", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });
            const dati = await res.json().catch(() => ({}));
            if (!res.ok) {
              setErrore(dati.error ?? t("disdetta.errore"));
              return;
            }
            setFatto(true);
          } catch {
            setErrore(t("errore.rete"));
          } finally {
            setInvio(false);
          }
        }}
        className="min-h-11 w-full rounded-full bg-danger px-5 text-sm font-medium text-white disabled:opacity-60"
      >
        {invio ? t("disdetta.invio") : t("disdetta.conferma")}
      </button>

      {errore && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {errore}
        </p>
      )}
    </div>
  );
}
