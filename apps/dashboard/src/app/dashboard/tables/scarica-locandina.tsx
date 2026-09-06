"use client";

import { useState } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tSala } from "@/i18n/sala";
import {
  disegnaLocandina,
  pdfLocandine,
  scarica,
  ABBONDANZA_MM,
  type DatiLocandina,
} from "./locandina";

export type { DatiLocandina };

/**
 * Il cavalierino di un singolo tavolo, in PNG o in PDF.
 *
 * Il download originale era il solo QR su fondo bianco: un ristoratore
 * doveva comunque passare da un grafico per farne qualcosa da mettere in
 * tavola. Qui esce un pezzo finito, con il marchio del locale.
 */
export function ScaricaLocandina({ dati }: { dati: DatiLocandina }) {
  const t = tSala(useLingua());
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function esegui(fn: () => Promise<void>) {
    setErrore(null);
    setInCorso(true);
    try {
      await fn();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : t("locandina.errore.file"));
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={inCorso}
          onClick={() =>
            esegui(async () => {
              const canvas = await disegnaLocandina(dati, t);
              const blob = await new Promise<Blob | null>((r) =>
                canvas.toBlob(r, "image/png")
              );
              if (!blob) throw new Error(t("locandina.errore.png"));
              scarica(blob, `${t("locandina.file.tavolo")}-${dati.codice}.png`);
            })
          }
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm disabled:opacity-50"
        >
          {inCorso ? t("locandina.preparo") : t("locandina.scarica_png")}
        </button>
        <button
          type="button"
          disabled={inCorso}
          onClick={() =>
            esegui(async () => {
              const blob = await pdfLocandine([dati], t);
              scarica(
                blob,
                `${t("locandina.file.tavolo")}-${dati.codice}-${t("locandina.file.stampa")}.pdf`
              );
            })
          }
          className="inline-flex min-h-11 items-center rounded-full border border-accent px-4 text-sm font-medium disabled:opacity-50"
        >
          {t("locandina.pdf_stampa")}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">
        {t("locandina.nota_stampa", { mm: ABBONDANZA_MM })}
      </p>
      {errore && <p className="mt-1 text-xs text-danger">{errore}</p>}
    </div>
  );
}
