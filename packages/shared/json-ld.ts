/**
 * Serializza un blocco JSON-LD da mettere dentro <script>.
 *
 * `JSON.stringify` non tocca la sequenza `</`, quindi un `</script>` finito
 * dentro un dato — il nome del locale, la descrizione di un piatto, tutti
 * campi che il ristoratore scrive liberamente dalla dashboard — chiude il tag
 * e il browser esegue quello che segue. Le pagine `/m/` e `/p/` sono
 * pubbliche e stanno sulla stessa origine del flusso di ordine e pagamento:
 * lì dentro girerebbe codice arbitrario davanti ai clienti, anche di altri
 * locali.
 *
 * Si escapano anche U+2028 e U+2029: sono terminatori di riga per il parser
 * JavaScript ma non per JSON, e rompono lo script anche senza tag.
 */
export function jsonLdSicuro(dati: unknown): string {
  return JSON.stringify(dati)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
