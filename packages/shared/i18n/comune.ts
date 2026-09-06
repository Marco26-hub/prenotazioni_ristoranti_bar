import { dizionario, type Speculare } from "./index";

/**
 * Le voci che valgono in tutte e due le applicazioni.
 *
 * Allergeni, stato di conservazione, diciture, azioni. Stanno qui e non in
 * ciascuna app perché sono le stesse parole: un allergene tradotto in due
 * modi diversi fra il menu e la scheda del piatto è un allergene di cui il
 * cliente non si fida.
 *
 * Sull'inglese degli allergeni: i quattordici nomi seguono l'Allegato II del
 * Reg. UE 1169/2011 nella sua versione inglese ufficiale, non una traduzione
 * libera. "Cereals containing gluten", non "Gluten". Chi è allergico cerca
 * esattamente quella formula, ed è quella che regge a un controllo.
 *
 * L'italiano resta comunque disponibile: è la lingua in cui il ristoratore
 * ha compilato e quella che il consumatore in Italia deve poter leggere.
 * L'inglese si aggiunge, non sostituisce.
 */

const IT = {
  // Allergeni — Allegato II Reg. UE 1169/2011
  "allergene.glutine": "Cereali con glutine",
  "allergene.crostacei": "Crostacei",
  "allergene.uova": "Uova",
  "allergene.pesce": "Pesce",
  "allergene.arachidi": "Arachidi",
  "allergene.soia": "Soia",
  "allergene.latte": "Latte",
  "allergene.frutta a guscio": "Frutta a guscio",
  "allergene.sedano": "Sedano",
  "allergene.senape": "Senape",
  "allergene.sesamo": "Semi di sesamo",
  "allergene.solfiti": "Anidride solforosa e solfiti",
  "allergene.lupini": "Lupini",
  "allergene.molluschi": "Molluschi",
  "allergeni.titolo": "Allergeni",
  "allergeni.nessuno": "Nessun allergene dichiarato",

  // Conservazione — D.Lgs. 109/1992, Reg. CE 853/2004
  "conservazione.fresco": "Fresco",
  "conservazione.congelato": "Congelato",
  "conservazione.surgelato": "Surgelato",
  "conservazione.abbattuto": "Abbattuto",
  "conservazione.nota.surgelato":
    "prodotto surgelato all'origine o congelato, in assenza di reperibilità del fresco",
  "conservazione.nota.abbattuto":
    "pesce sottoposto ad abbattimento rapido di temperatura come previsto dal Reg. CE 853/2004",

  // Diciture
  "dicitura.vegetariano": "Vegetariano",
  "dicitura.vegano": "Vegano",
  "dicitura.senza_glutine": "Senza glutine",
  "dicitura.senza_lattosio": "Senza lattosio",
  "dicitura.piccante": "Piccante",

  /*
   * Coperto e servizio.
   *
   * Stanno qui e non nel dizionario di una pagina sola perché vanno detti in
   * DUE posti — il menu del tavolo e la carta pubblica — e devono dire la
   * stessa cosa. La norma sui prezzi mette il coperto alla pari di un piatto
   * (R.D. 635/1940 art. 180): va scritto dove il cliente sceglie, non solo in
   * fondo al conto. Due frasi diverse nei due posti sono il modo più semplice
   * di ritrovarsi con una delle due sbagliata.
   */
  "coperto.etichetta": "Coperto",
  "coperto.riga": "{etichetta} {prezzo} a persona.",
  "servizio.riga": "Servizio {percento}% sull'ordinato.",

  // Azioni
  "azione.annulla": "Annulla",
  "azione.conferma": "Conferma",
  "azione.chiudi": "Chiudi",
  "azione.indietro": "Indietro",
  "azione.avanti": "Avanti",
  "azione.salva": "Salva",
  "azione.invia": "Invia",
  "azione.riprova": "Riprova",
  "azione.aggiungi": "Aggiungi",
  "azione.rimuovi": "Rimuovi",
  "azione.modifica": "Modifica",
  "azione.elimina": "Elimina",
  "azione.cerca": "Cerca",
  "azione.copia": "Copia",
  "azione.copiato": "Copiato",
  "azione.scarica": "Scarica",
  "azione.stampa": "Stampa",

  // Stati
  "stato.caricamento": "Caricamento…",
  "stato.attendere": "Un momento…",
  "stato.vuoto": "Niente da mostrare",
  "stato.errore": "Qualcosa non ha funzionato",
  "stato.errore.rete": "Connessione assente. Controlla la rete e riprova.",
  "stato.errore.riprova": "Non è andata. Riprova fra un momento.",

  // Lingua
  "lingua.etichetta": "Lingua",
  "lingua.scegli": "Scegli la lingua",
};

const EN: Speculare<typeof IT> = {
  "allergene.glutine": "Cereals containing gluten",
  "allergene.crostacei": "Crustaceans",
  "allergene.uova": "Eggs",
  "allergene.pesce": "Fish",
  "allergene.arachidi": "Peanuts",
  "allergene.soia": "Soybeans",
  "allergene.latte": "Milk",
  "allergene.frutta a guscio": "Nuts",
  "allergene.sedano": "Celery",
  "allergene.senape": "Mustard",
  "allergene.sesamo": "Sesame seeds",
  "allergene.solfiti": "Sulphur dioxide and sulphites",
  "allergene.lupini": "Lupin",
  "allergene.molluschi": "Molluscs",
  "allergeni.titolo": "Allergens",
  "allergeni.nessuno": "No allergens declared",

  "conservazione.fresco": "Fresh",
  "conservazione.congelato": "Frozen",
  "conservazione.surgelato": "Deep-frozen",
  "conservazione.abbattuto": "Blast-chilled",
  "conservazione.nota.surgelato":
    "deep-frozen at source or frozen, when fresh product is unavailable",
  "conservazione.nota.abbattuto":
    "fish subjected to rapid blast-chilling as required by Reg. EC 853/2004",

  "dicitura.vegetariano": "Vegetarian",
  "dicitura.vegano": "Vegan",
  "dicitura.senza_glutine": "Gluten free",
  "dicitura.senza_lattosio": "Lactose free",
  "dicitura.piccante": "Spicy",

  "coperto.etichetta": "Cover charge",
  "coperto.riga": "{etichetta} {prezzo} per person.",
  "servizio.riga": "Service charge {percento}% on the order.",

  "azione.annulla": "Cancel",
  "azione.conferma": "Confirm",
  "azione.chiudi": "Close",
  "azione.indietro": "Back",
  "azione.avanti": "Next",
  "azione.salva": "Save",
  "azione.invia": "Send",
  "azione.riprova": "Try again",
  "azione.aggiungi": "Add",
  "azione.rimuovi": "Remove",
  "azione.modifica": "Edit",
  "azione.elimina": "Delete",
  "azione.cerca": "Search",
  "azione.copia": "Copy",
  "azione.copiato": "Copied",
  "azione.scarica": "Download",
  "azione.stampa": "Print",

  "stato.caricamento": "Loading…",
  "stato.attendere": "One moment…",
  "stato.vuoto": "Nothing to show",
  "stato.errore": "Something went wrong",
  "stato.errore.rete": "No connection. Check your network and try again.",
  "stato.errore.riprova": "That didn't work. Try again in a moment.",

  "lingua.etichetta": "Language",
  "lingua.scegli": "Choose your language",
};

export const tComune = dizionario(IT, EN);
export type VociComuni = typeof IT;

/**
 * La nota in fondo alla carta, nella lingua di chi legge.
 *
 * Sostituisce `notaConservazione` di bevande.ts quando la lingua conta.
 * L'asterisco resta l'asterisco: è quello che il cliente cerca accanto al
 * nome del piatto, e cambia significato se cambia simbolo.
 */
export function notaConservazioneTradotta(
  presenti: string[],
  lingua: "it" | "en"
): string | null {
  const t = tComune(lingua);
  const insieme = new Set(presenti.filter((c) => c !== "fresco"));
  if (insieme.size === 0) return null;

  const parti: string[] = [];
  if (insieme.has("surgelato") || insieme.has("congelato")) {
    parti.push(t("conservazione.nota.surgelato"));
  }
  if (insieme.has("abbattuto")) parti.push(t("conservazione.nota.abbattuto"));
  return `* ${parti.join("; ")}.`;
}
