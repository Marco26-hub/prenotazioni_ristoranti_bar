/**
 * Versione dell'accordo di nomina a responsabile del trattamento.
 *
 * Va incrementata a ogni modifica sostanziale del testo in /dpa. Il
 * gestionale confronta questa costante con la versione accettata dal locale
 * e, se non coincidono, richiede una nuova accettazione: senza il confronto
 * non si saprebbe a quale testo il locale ha effettivamente aderito.
 */
export const DPA_VERSION = "2026-09-2";

export interface SottoResponsabile {
  nome: string;
  /** Chiave di dizionario: la riga la legge anche chi non parla italiano. */
  attivita: string;
  dove: string;
}

/**
 * Elenco dei sotto-responsabili, pubblicato perché l'art. 28.2 dà al titolare
 * il diritto di sapere chi tocca i dati e di opporsi ai cambiamenti.
 *
 * Va aggiornato *prima* di introdurre un nuovo fornitore, non dopo: il
 * preavviso di 5 giorni promesso nell'accordo decorre dalla pubblicazione.
 *
 * Il nome resta scritto qui perché è una ragione sociale e non si traduce;
 * attività e collocazione sono chiavi, e il testo sta nel dizionario.
 */
export const SOTTO_RESPONSABILI: SottoResponsabile[] = [
  {
    nome: "Neon, gruppo Databricks (banca dati PostgreSQL)",
    attivita: "dpa.art7.neon.attivita",
    dove: "dpa.art7.neon.dove",
  },
  {
    nome: "Vercel (hosting applicativo)",
    attivita: "dpa.art7.vercel.attivita",
    dove: "dpa.art7.vercel.dove",
  },
  {
    nome: "Invoicetronic o intermediario SDI equivalente",
    attivita: "dpa.art7.sdi.attivita",
    dove: "dpa.art7.sdi.dove",
  },
  {
    nome: "Tilby (Zucchetti)",
    attivita: "dpa.art7.tilby.attivita",
    dove: "dpa.art7.tilby.dove",
  },
];
