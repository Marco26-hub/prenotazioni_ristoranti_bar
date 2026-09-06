"use client";

import { COOKIE_LINGUA, NOME_LINGUA_UI, LINGUE_UI, type LinguaUI } from "@repo/shared/i18n";
import { tComune } from "@repo/shared/i18n/comune";

/**
 * Italiano o inglese, due link.
 *
 * Link e non menu a tendina, e nessuna chiamata al server: al tavolo la rete
 * è quella che è, e un selettore che ha bisogno del JavaScript per funzionare
 * lascia il turista sull'italiano finché la pagina non finisce di caricare.
 * Il link con `?lang=` funziona sempre; il cookie, che serve solo a
 * ricordarsene alla pagina dopo, si scrive quando il JavaScript c'è.
 *
 * Niente bandiere: la bandiera del Regno Unito per un americano è sbagliata,
 * e per l'italiano non ce n'è una sola. Il nome della lingua nella lingua
 * stessa è ciò che tutti riconoscono.
 */
export function SelettoreLinguaUI({
  attiva,
  className = "",
}: {
  attiva: LinguaUI;
  className?: string;
}) {
  return (
    // L'etichetta per il lettore di schermo segue la lingua attiva: chi
    // naviga a voce in italiano sente "Lingua", non "Language".
    <nav aria-label={tComune(attiva)("lingua.etichetta")} className={`flex gap-1 ${className}`}>
      {LINGUE_UI.map((l) => (
        <a
          key={l}
          href={`?lang=${l}`}
          hrefLang={l}
          aria-current={l === attiva ? "true" : undefined}
          onClick={() => {
            // Un anno: la lingua di una persona non cambia fra una cena e
            // l'altra. `lax` perché la pagina si apre da un QR, cioè da
            // fuori, e `strict` la farebbe ripartire sempre in italiano.
            document.cookie = `${COOKIE_LINGUA}=${l};path=/;max-age=31536000;samesite=lax`;
          }}
          className={`flex min-h-9 items-center rounded-full px-2.5 text-xs font-medium ${
            l === attiva
              ? "bg-accent text-accent-foreground"
              : "border border-border text-muted"
          }`}
        >
          {NOME_LINGUA_UI[l]}
        </a>
      ))}
    </nav>
  );
}
