"use client";

import { useState } from "react";
import { pdfLocandine, scarica, ABBONDANZA_MM, type DatiLocandina } from "./locandina";

/**
 * Un solo PDF con tutti i tavoli, una pagina ciascuno.
 *
 * Scaricare undici file uno per uno e portarli in copisteria è il modo in
 * cui si perde il tavolo 7. Qui esce un file solo, nell'ordine dei tavoli.
 */
export function PdfTutti({
  tavoli,
  nomeLocale,
}: {
  tavoli: DatiLocandina[];
  nomeLocale: string;
}) {
  const [stato, setStato] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  if (tavoli.length === 0) return null;

  return (
    <div className="rounded-xl border border-accent bg-surface p-4">
      <h2 className="font-semibold">Tutti i cavalierini in un PDF</h2>
      <p className="mt-0.5 mb-3 text-sm text-muted">
        Un file solo con i {tavoli.length} tavoli, una pagina ciascuno, A6 con{" "}
        {ABBONDANZA_MM} mm di abbondanza e crocini di taglio. È il file da
        mandare allo stampatore.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={inCorso}
          onClick={async () => {
            setInCorso(true);
            setStato(null);
            try {
              const blob = await pdfLocandine(tavoli, (fatti, totale) =>
                setStato(`Compongo ${fatti} di ${totale}…`)
              );
              const nome = nomeLocale
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
              scarica(blob, `cavalierini-${nome || "locale"}.pdf`);
              setStato(`Pronto: ${tavoli.length} pagine.`);
            } catch (e) {
              setStato(
                e instanceof Error ? e.message : "Non è stato possibile creare il PDF"
              );
            } finally {
              setInCorso(false);
            }
          }}
          className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {inCorso ? "Creo il PDF…" : `Crea PDF di tutti i ${tavoli.length} tavoli`}
        </button>
        {stato && <p className="text-sm">{stato}</p>}
      </div>
    </div>
  );
}
