/**
 * Il documento è uscito ma senza numero.
 *
 * L'endpoint che riceve l'esito parla con l'agente della stampante, non con
 * un browser: lì non c'è nessuna sessione, quindi nessuna lingua da usare.
 * Si scrive una sentinella nella colonna `errore` e si traduce dove la si
 * legge. Il resto di quella colonna è testo della stampante e resta com'è.
 */
export const RT_SENZA_NUMERO = "__rt_senza_numero__";

/** Anche le righe scritte prima della sentinella vanno riconosciute. */
export const RT_SENZA_NUMERO_LEGACY =
  "Emesso, ma la stampante non ha restituito il numero: recuperalo dal registratore.";
