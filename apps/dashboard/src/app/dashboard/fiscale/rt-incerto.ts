/**
 * Lo scontrino potrebbe essere già uscito: nessuno lo sa.
 *
 * Quando la connessione con la stampante cade a comando già partito — un
 * timeout, un socket interrotto — non si può dire se il documento sia stato
 * stampato o no. Rimetterlo in coda significherebbe rischiare di certificare
 * due volte lo stesso incasso; dichiararlo non riuscito significherebbe il
 * contrario. Resta quindi 'in_corso' e viene marcato qui: la coda smette di
 * riconsegnarlo e la pagina Corrispettivi lo mostra come da verificare sul
 * registratore, che è l'unica cosa che una persona può davvero fare.
 *
 * Sentinella e non frase tradotta: chi la scrive è l'endpoint che parla con
 * l'agente della stampante, dove non c'è nessuna sessione e nessuna lingua.
 * Il testo della stampante, quando c'è, la segue dopo uno spazio.
 */
export const RT_DA_VERIFICARE = "__rt_da_verificare__";
