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
  attivita: string;
  dove: string;
}

/**
 * Elenco dei sotto-responsabili, pubblicato perché l'art. 28.2 dà al titolare
 * il diritto di sapere chi tocca i dati e di opporsi ai cambiamenti.
 *
 * Va aggiornato *prima* di introdurre un nuovo fornitore, non dopo: il
 * preavviso di 5 giorni promesso nell'accordo decorre dalla pubblicazione.
 */
export const SOTTO_RESPONSABILI: SottoResponsabile[] = [
  {
    nome: "Neon, gruppo Databricks (banca dati PostgreSQL)",
    attivita: "Conservazione di tutti i dati del servizio",
    dove: "Dati a Francoforte; capogruppo negli Stati Uniti",
  },
  {
    nome: "Vercel (hosting applicativo)",
    attivita: "Esecuzione dell'applicazione e consegna delle pagine",
    dove: "Rete globale; capogruppo negli Stati Uniti",
  },
  {
    nome: "Invoicetronic o intermediario SDI equivalente",
    attivita:
      "Trasmissione delle fatture elettroniche al Sistema di Interscambio, solo se attivato dal locale",
    dove: "Unione Europea",
  },
  {
    nome: "Tilby (Zucchetti)",
    attivita:
      "Lettura del listino dalla cassa per importare il menu, solo se il collegamento è attivato dal locale. Nessun dato dei clienti gli viene inviato",
    dove: "Unione Europea",
  },
];
