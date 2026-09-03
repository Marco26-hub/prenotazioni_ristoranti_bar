"use client";

/**
 * Stampa del report del periodo scelto.
 *
 * Passa dal dialogo di stampa del browser e non da una libreria PDF: da lì si
 * sceglie la stampante oppure "Salva come PDF", che è entrambe le cose che
 * servono, e il testo resta selezionabile invece di diventare un'immagine —
 * un commercialista il numero lo copia, non lo ricopia a mano.
 */
export function StampaReport({ periodo }: { periodo: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-full border border-border px-4 text-sm print:hidden"
    >
      Stampa o salva PDF
    </button>
  );
}
