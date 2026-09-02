"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Piccolo archivio attorno a localStorage.
 *
 * Serve per leggere una memoria che esiste solo nel browser senza far
 * divergere il primo render dal server: `useSyncExternalStore` chiede una
 * risposta separata per il server, e lì rispondiamo "già chiuso" così il
 * server non disegna nulla e non c'è idratazione da correggere.
 */
const ascoltatori = new Set<() => void>();

function iscrivi(fn: () => void) {
  ascoltatori.add(fn);
  return () => {
    ascoltatori.delete(fn);
  };
}

function leggiChiuso(chiave: string): boolean {
  try {
    return window.localStorage.getItem(chiave) === "chiuso";
  } catch {
    // Incognito o memoria negata: si mostra comunque. Meglio un annuncio di
    // troppo che una promozione che nessuno vede mai.
    return false;
  }
}

function segnaChiuso(chiave: string) {
  try {
    window.localStorage.setItem(chiave, "chiuso");
  } catch {
    // Non poterlo ricordare non deve impedire di chiuderlo adesso.
  }
  for (const fn of ascoltatori) fn();
}

export interface Annuncio {
  titolo: string;
  testo: string | null;
  immagine: string | null;
  ctaEtichetta: string | null;
  ctaUrl: string | null;
  versione: number;
}

/**
 * Annuncio del locale all'apertura del menu: piatto del giorno, serata a
 * tema, chiusura straordinaria.
 *
 * Si chiude e non torna: chi è seduto al tavolo ricarica la pagina più
 * volte durante la cena, e un riquadro che si ripiazza davanti al menu a
 * ogni ricarica smette di essere una promozione e diventa un ostacolo.
 * La scelta resta sul dispositivo del cliente e non ci viene comunicata.
 */
export function AnnuncioLocale({
  annuncio,
  venueSlug,
}: {
  annuncio: Annuncio;
  venueSlug: string;
}) {
  const chiave = `annuncio:${venueSlug}:${annuncio.versione}`;

  const chiuso = useSyncExternalStore(
    iscrivi,
    () => leggiChiuso(chiave),
    () => true
  );

  const chiudi = useCallback(() => segnaChiuso(chiave), [chiave]);

  useEffect(() => {
    if (chiuso) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") chiudi();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chiuso, chiudi]);

  if (chiuso) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={chiudi}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="annuncio-titolo"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-0"
      >
        <div className="sticky top-0 flex justify-end bg-surface/95 p-2 backdrop-blur">
          <button
            type="button"
            onClick={chiudi}
            aria-label="Chiudi l'annuncio"
            className="h-11 w-11 rounded-full border border-border text-lg leading-none"
          >
            ×
          </button>
        </div>

        {annuncio.immagine && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={annuncio.immagine} alt="" className="h-40 w-full object-cover" />
        )}

        <div className="space-y-3 px-5 pb-5 pt-4">
          <h2 id="annuncio-titolo" className="text-xl font-semibold leading-snug">
            {annuncio.titolo}
          </h2>

          {annuncio.testo && (
            <p className="whitespace-pre-line leading-relaxed">{annuncio.testo}</p>
          )}

          {annuncio.ctaUrl && annuncio.ctaEtichetta && (
            <a
              href={annuncio.ctaUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex min-h-12 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground"
            >
              {annuncio.ctaEtichetta}
            </a>
          )}

          <button
            type="button"
            onClick={chiudi}
            className="min-h-12 w-full rounded-full border border-border font-medium"
          >
            Vai al menu
          </button>
        </div>
      </div>
    </div>
  );
}
