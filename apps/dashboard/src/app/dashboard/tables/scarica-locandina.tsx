"use client";

import { useState } from "react";
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
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function esegui(fn: () => Promise<void>) {
    setErrore(null);
    setInCorso(true);
    try {
      await fn();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Non è stato possibile creare il file");
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
              const canvas = await disegnaLocandina(dati);
              const blob = await new Promise<Blob | null>((r) =>
                canvas.toBlob(r, "image/png")
              );
              if (!blob) throw new Error("Immagine non generata");
              scarica(blob, `tavolo-${dati.codice}.png`);
            })
          }
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm disabled:opacity-50"
        >
          {inCorso ? "Preparo…" : "Scarica PNG"}
        </button>
        <button
          type="button"
          disabled={inCorso}
          onClick={() =>
            esegui(async () => {
              const blob = await pdfLocandine([dati]);
              scarica(blob, `tavolo-${dati.codice}-stampa.pdf`);
            })
          }
          className="inline-flex min-h-11 items-center rounded-full border border-accent px-4 text-sm font-medium disabled:opacity-50"
        >
          PDF per la tipografia
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">
        A6 a 300 dpi. Il PDF ha {ABBONDANZA_MM} mm di abbondanza per lato e i
        crocini di taglio.
      </p>
      {errore && <p className="mt-1 text-xs text-danger">{errore}</p>}
    </div>
  );
}
