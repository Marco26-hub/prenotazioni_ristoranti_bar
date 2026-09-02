/**
 * Bevande: come si descrivono e come si presentano.
 *
 * Il formato — calice, 0,375, 0,75, magnum — non sta qui: è una variante,
 * perché cambia il prezzo e può esaurirsi da solo. Qui c'è ciò che una
 * carta dei vini scrive accanto al nome.
 */

export type TipoVoce = "food" | "wine" | "beer" | "drink";

export const TIPO_ETICHETTA: Record<TipoVoce, string> = {
  food: "Piatto",
  wine: "Vino",
  beer: "Birra",
  drink: "Altra bevanda",
};

/** Formati comuni, come suggerimento in fase di configurazione. */
export const FORMATI_VINO = [
  { nome: "Calice", ml: 150 },
  { nome: "Mezza bottiglia 0,375L", ml: 375 },
  { nome: "Bottiglia 0,75L", ml: 750 },
  { nome: "Magnum 1,5L", ml: 1500 },
  { nome: "Jéroboam 3L", ml: 3000 },
];

export const FORMATI_BIRRA = [
  { nome: "Piccola 0,2L", ml: 200 },
  { nome: "Media 0,4L", ml: 400 },
  { nome: "Pinta 0,5L", ml: 500 },
  { nome: "Bottiglia 0,33L", ml: 330 },
];

export interface DettagliBevanda {
  producer: string | null;
  vintage: number | null;
  denomination: string | null;
  origin: string | null;
  abv: number | string | null;
  serving_note: string | null;
}

/**
 * Riga sotto il nome: "Cantina — Zona · DOCG · 2021 · 13,5%".
 *
 * Solo i campi valorizzati, senza separatori appesi al vuoto: una carta con
 * dei trattini che non separano nulla si legge male e sembra sbagliata.
 */
export function descriviBevanda(d: DettagliBevanda): string | null {
  const pezzi = [
    d.producer,
    d.origin,
    d.denomination,
    d.vintage ? String(d.vintage) : null,
    d.abv ? `${Number(d.abv).toString().replace(".", ",")}%` : null,
  ].filter((p): p is string => Boolean(p));

  return pezzi.length > 0 ? pezzi.join(" · ") : null;
}

/**
 * Il vino con più di 10 mg/l di solfiti deve dichiararli: è un allergene
 * dell'allegato II del Reg. UE 1169/2011, non una cortesia. Praticamente
 * ogni vino in commercio li supera, quindi l'assenza della dicitura su una
 * carta dei vini è quasi sempre una dimenticanza.
 */
export function mancanoSolfiti(kind: TipoVoce, allergeni: string[] | null): boolean {
  if (kind !== "wine") return false;
  return !(allergeni ?? []).some((a) => a.toLowerCase().includes("solfit"));
}


/**
 * Stato di conservazione.
 *
 * Il congelato va dichiarato con un asterisco e una nota (Reg. UE 1169/2011,
 * D.Lgs. 109/1992): ometterlo è frode in commercio, punita fino a due anni.
 * L'abbattuto riguarda il pesce servito crudo, congelato a −20 °C per
 * almeno 24 ore contro l'Anisakis (Reg. CE 853/2004).
 */
export type Conservazione = "fresco" | "congelato" | "surgelato" | "abbattuto";

export const CONSERVAZIONE_ETICHETTA: Record<Conservazione, string> = {
  fresco: "Fresco",
  congelato: "Congelato",
  surgelato: "Surgelato",
  abbattuto: "Abbattuto",
};

/** Nota da stampare in fondo alla carta, costruita su ciò che c'è davvero. */
export function notaConservazione(presenti: Conservazione[]): string | null {
  const insieme = new Set(presenti.filter((c) => c !== "fresco"));
  if (insieme.size === 0) return null;

  const parti: string[] = [];
  if (insieme.has("surgelato") || insieme.has("congelato")) {
    parti.push(
      "prodotto surgelato all'origine o congelato, in assenza di reperibilità del fresco"
    );
  }
  if (insieme.has("abbattuto")) {
    parti.push(
      "pesce sottoposto ad abbattimento rapido di temperatura come previsto dal Reg. CE 853/2004"
    );
  }
  return `* ${parti.join("; ")}.`;
}
