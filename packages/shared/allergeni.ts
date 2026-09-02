/**
 * I quattordici allergeni dell'Allegato II del Reg. UE 1169/2011.
 *
 * L'elenco è chiuso: non sono quelli che il locale ritiene rilevanti, sono
 * esattamente questi. Il campo libero che c'era prima lasciava scrivere
 * "latticini", "frutta secca" o "crostacei/molluschi": tutte diciture che a
 * un controllo non valgono come dichiarazione, e che un cliente celiaco o
 * allergico legge senza trovare la parola che cerca.
 *
 * Le chiavi restano quelle già salvate a database, così i menu esistenti non
 * vanno riscritti.
 */

export interface Allergene {
  chiave: string;
  etichetta: string;
  /** Come compare di solito su un menu, per farlo riconoscere a chi compila. */
  esempi: string;
}

export const ALLERGENI: Allergene[] = [
  {
    chiave: "glutine",
    etichetta: "Cereali con glutine",
    esempi: "grano, segale, orzo, farro, kamut",
  },
  { chiave: "crostacei", etichetta: "Crostacei", esempi: "gambero, scampo, granchio" },
  { chiave: "uova", etichetta: "Uova", esempi: "anche in paste e maionese" },
  { chiave: "pesce", etichetta: "Pesce", esempi: "anche colle e brodi di pesce" },
  { chiave: "arachidi", etichetta: "Arachidi", esempi: "distinte dalla frutta a guscio" },
  { chiave: "soia", etichetta: "Soia", esempi: "salsa di soia, lecitina" },
  { chiave: "latte", etichetta: "Latte", esempi: "compreso il lattosio, burro, formaggi" },
  {
    chiave: "frutta a guscio",
    etichetta: "Frutta a guscio",
    esempi: "mandorle, nocciole, noci, pistacchi",
  },
  { chiave: "sedano", etichetta: "Sedano", esempi: "anche nei fondi e nei brodi" },
  { chiave: "senape", etichetta: "Senape", esempi: "anche in salse e marinature" },
  { chiave: "sesamo", etichetta: "Semi di sesamo", esempi: "pane, hummus, tahina" },
  {
    chiave: "solfiti",
    etichetta: "Anidride solforosa e solfiti",
    esempi: "vino, aceto, frutta secca — oltre 10 mg/kg",
  },
  { chiave: "lupini", etichetta: "Lupini", esempi: "farine senza glutine, hamburger veg" },
  { chiave: "molluschi", etichetta: "Molluschi", esempi: "cozze, vongole, calamaro, polpo" },
];

const PER_CHIAVE = new Map(ALLERGENI.map((a) => [a.chiave, a]));

/**
 * Normalizza quello che è già a database: i menu importati da CSV o compilati
 * a mano prima dei flag contengono diciture libere. Quelle riconoscibili le
 * riportiamo alla chiave ufficiale, le altre le teniamo così come sono
 * perché cancellarle sarebbe peggio che avere una dicitura imprecisa.
 */
const SINONIMI: Record<string, string> = {
  latticini: "latte",
  lattosio: "latte",
  formaggio: "latte",
  glutine_cereali: "glutine",
  frumento: "glutine",
  grano: "glutine",
  "frutta secca": "frutta a guscio",
  "frutta a guscio (noci)": "frutta a guscio",
  noci: "frutta a guscio",
  uovo: "uova",
  solfito: "solfiti",
  "anidride solforosa": "solfiti",
  gamberi: "crostacei",
  vongole: "molluschi",
};

export function normalizzaAllergene(valore: string): string {
  const v = valore.trim().toLowerCase();
  if (PER_CHIAVE.has(v)) return v;
  return SINONIMI[v] ?? v;
}

export function normalizzaAllergeni(valori: string[] | null | undefined): string[] {
  const visti = new Set<string>();
  for (const v of valori ?? []) {
    const n = normalizzaAllergene(v);
    if (n) visti.add(n);
  }
  return [...visti];
}

/** Etichetta leggibile, con ripiego sul valore grezzo per le voci fuori elenco. */
export function etichettaAllergene(chiave: string): string {
  return PER_CHIAVE.get(chiave)?.etichetta ?? chiave;
}

/** Voci salvate che non corrispondono a nessuno dei quattordici. */
export function allergeniFuoriElenco(valori: string[] | null | undefined): string[] {
  return (valori ?? []).filter((v) => !PER_CHIAVE.has(normalizzaAllergene(v)));
}
