/**
 * Tipi e costanti della lettura etichette, senza `server-only`.
 *
 * Separati dal client HTTP perché un componente client ha bisogno del
 * modello predefinito e della forma della scheda, e importare il modulo
 * che fa la chiamata trascinerebbe `server-only` nel bundle del browser:
 * il build fallisce, ed è la stessa ragione per cui `db` non è mai
 * riesportato dall'indice.
 */

export interface SchedaVino {
  name?: string;
  producer?: string;
  vintage?: number;
  denomination?: string;
  origin?: string;
  abv?: number;
  ingredients?: string;
  description?: string;
  allergens?: string[];
  /** Cosa il modello non è riuscito a leggere: va chiesto all'operatore. */
  incerti?: string[];
}

/** Modello suggerito. Sovrascrivibile: il catalogo di OpenRouter cambia. */
export const MODELLO_PREDEFINITO = "google/gemini-2.5-flash";
