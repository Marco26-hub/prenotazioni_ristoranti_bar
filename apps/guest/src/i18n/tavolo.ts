import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * La pagina del tavolo: quella che si apre inquadrando il QR.
 *
 * È l'unica schermata che il cliente usa davvero per ordinare, e l'unica in
 * cui una parola sbagliata costa un piatto sbagliato. Le voci che valgono
 * anche altrove — allergeni, conservazione, diciture, azioni generiche —
 * stanno in `i18n/comune.ts` e non si ripetono qui.
 *
 * Sull'inglese: è un ordine al tavolo, non un carrello di un negozio, quindi
 * "Add to order". Il conto è "Bill", non "Check": il turista in Italia legge
 * inglese britannico. Coperto e servizio hanno un nome preciso e non si
 * traducono a orecchio — "cover charge" e "service charge" sono le due voci
 * che finiscono sul conto e che il cliente contesta se non le riconosce.
 */

const IT = {
  // Intestazione e navigazione
  // La domanda dei coperti, a prezzo fisso. È una proposta del tavolo: la
  // conferma resta al personale, e i testi non devono far credere il
  // contrario a chi la legge seduto.
  "coperti.domanda": "In quanti siete a tavolo?",
  "coperti.perche":
    "Il prezzo fisso è a persona: serve per farti vedere il conto giusto mentre ordini.",
  "coperti.detto.uno": "Hai detto che siete in {n}.",
  "coperti.detto.molti": "Hai detto che siete in {n}.",
  "coperti.correggi": "Correggi",
  "coperti.in_attesa":
    "Il personale lo conferma quando passa: fino ad allora il totale è provvisorio.",
  "coperti.di_piu": "Siete di più?",
  "coperti.non_riuscito": "Non è riuscito. Riprova, o dillo al personale.",
  "tavolo.etichetta": "Tavolo",
  "nav.aria": "Navigazione tavolo",
  "nav.menu": "Menu e ordine",
  "nav.paga": "Paga ora",
  "sezione.ordine": "Ordina dal tavolo",
  "sezione.conto": "Conto e pagamento",

  // Coperto e servizio: la norma sui prezzi li mette alla pari di un piatto
  "coperto.etichetta": "Coperto",
  "coperto.riga": "{etichetta} {prezzo} a persona.",
  "servizio.riga": "Servizio {percento}% sull'ordinato.",

  // Piè di pagina
  "footer.piva": "P.IVA {numero}",
  "footer.privacy": "Privacy",
  "footer.termini": "Termini",
  "footer.cookie": "Cookie",

  // Ricerca nel menu
  "ricerca.placeholder": "Cerca un piatto o un ingrediente",
  "ricerca.aria": "Cerca nel menu",
  "ricerca.risultati.aria": "Risultati per {cerca}",
  "ricerca.nessuno": 'Nessun piatto per "{cerca}"',
  "ricerca.conteggio.uno": '{n} piatto per "{cerca}"',
  "ricerca.conteggio.molti": '{n} piatti per "{cerca}"',
  "ricerca.suggerimento": "Prova con una parola sola, o chiedi al personale.",

  // Filtro per portata
  "filtro.aria": "Filtra per portata",
  "filtro.tutto": "Tutto",

  // Elenco e scheda del piatto
  "piatto.dettagli.aria": "Dettagli di {nome}",
  "piatto.aggiungi.aria": "Aggiungi {nome}",
  "piatto.togli.aria": "Togli {nome}",
  "piatto.origine": "Origine: {nota}",
  "piatto.ingredienti": "Ingredienti",
  "allergeni.dettagli": "Allergeni e dettagli",
  "allergeni.nessuno":
    "Nessuno segnalato. Per intolleranze o allergie chiedi al personale.",

  // Formula a prezzo fisso
  "formula.compreso": "Compreso nella formula",
  "formula.fuori": "fuori formula",

  // Varianti e aggiunte
  "varianti.titolo": "Varianti e aggiunte",
  "varianti.dascegliere": "Da scegliere",
  "varianti.obbligatorio": "obbligatorio",
  "varianti.finoa": "— fino a {n}",
  "varianti.senza": "Senza {nome}",
  "varianti.esaurito": "esaurito",
  "varianti.scegli": "Scegli {gruppo}",
  "varianti.minimo": "Per {gruppo} scegli almeno {n}",
  "varianti.continua": "Scegli {gruppo} per continuare",

  // Abbinamento suggerito
  "abbinamento.titolo": "Si abbina bene con",

  // Pulsante di aggiunta nella scheda
  "aggiungi.carrello": "Aggiungi al carrello",
  "aggiungi.ancora": "Aggiungi ancora ({n} nel carrello)",

  // Note per la cucina
  "nota.aggiungi": "Aggiungi una nota",
  "nota.esempio": "Es. senza cipolla, senza glutine",
  "nota.cucina": "Nota per la cucina",
  "nota.breve": "nota",
  "nota.per.aria": "Nota per {nome}",

  // Invito a ordinare e menu vuoto
  "invito.tocca": "Tocca",
  "invito.resto":
    "per ordinare dal tavolo. Poi potrai cambiare le quantità e aggiungere una nota per la cucina.",
  "menu.vuoto": "Il menu non è ancora disponibile. Chiedi al personale.",

  // Riepilogo e invio dell'ordine
  "ordine.titolo": "Il tuo ordine",
  "ordine.totale": "Totale",
  "ordine.invia": "Ordina",
  "ordine.invio": "Invio…",
  "ordine.inviato": "Ordine inviato in cucina.",
  "barra.articoli.uno": "articolo",
  "barra.articoli.molti": "articoli",
  "barra.vedi": "vedi",
  "attesa.ancora": "Ancora {tempo}",
  "attesa.minuti": "{n} min",
  "attesa.secondi": "{n} s",
  "errore.invio": "Errore invio ordine",
};

const EN: Speculare<typeof IT> = {
  "coperti.domanda": "How many of you are at the table?",
  "coperti.perche":
    "The set menu is priced per person: this is so the bill you see while ordering is the right one.",
  "coperti.detto.uno": "You said there is {n} of you.",
  "coperti.detto.molti": "You said there are {n} of you.",
  "coperti.correggi": "Change",
  "coperti.in_attesa":
    "A member of staff will confirm it when they come by: until then the total is provisional.",
  "coperti.di_piu": "More than that?",
  "coperti.non_riuscito": "That didn\u2019t work. Try again, or tell a member of staff.",
  "tavolo.etichetta": "Table",
  "nav.aria": "Table navigation",
  "nav.menu": "Menu and order",
  "nav.paga": "Pay now",
  "sezione.ordine": "Order from your table",
  "sezione.conto": "Bill and payment",

  "coperto.etichetta": "Cover charge",
  "coperto.riga": "{etichetta} {prezzo} per person.",
  "servizio.riga": "Service charge {percento}% on the order.",

  "footer.piva": "VAT no. {numero}",
  "footer.privacy": "Privacy",
  "footer.termini": "Terms",
  "footer.cookie": "Cookies",

  "ricerca.placeholder": "Search for a dish or an ingredient",
  "ricerca.aria": "Search the menu",
  "ricerca.risultati.aria": "Results for {cerca}",
  "ricerca.nessuno": 'No dishes for "{cerca}"',
  "ricerca.conteggio.uno": '{n} dish for "{cerca}"',
  "ricerca.conteggio.molti": '{n} dishes for "{cerca}"',
  "ricerca.suggerimento": "Try a single word, or ask a member of staff.",

  "filtro.aria": "Filter by course",
  "filtro.tutto": "All",

  "piatto.dettagli.aria": "Details for {nome}",
  "piatto.aggiungi.aria": "Add {nome}",
  "piatto.togli.aria": "Remove {nome}",
  "piatto.origine": "Origin: {nota}",
  "piatto.ingredienti": "Ingredients",
  "allergeni.dettagli": "Allergens and details",
  "allergeni.nessuno":
    "None declared. For intolerances or allergies please ask a member of staff.",

  "formula.compreso": "Included in the set menu",
  "formula.fuori": "charged extra",

  "varianti.titolo": "Options and extras",
  "varianti.dascegliere": "Choices required",
  "varianti.obbligatorio": "required",
  "varianti.finoa": "— up to {n}",
  "varianti.senza": "Without {nome}",
  "varianti.esaurito": "sold out",
  "varianti.scegli": "Choose {gruppo}",
  "varianti.minimo": "For {gruppo} choose at least {n}",
  "varianti.continua": "Choose {gruppo} to continue",

  "abbinamento.titolo": "Goes well with",

  "aggiungi.carrello": "Add to order",
  "aggiungi.ancora": "Add another ({n} in your order)",

  "nota.aggiungi": "Add a note",
  "nota.esempio": "E.g. no onion, gluten free",
  "nota.cucina": "Note for the kitchen",
  "nota.breve": "note",
  "nota.per.aria": "Note for {nome}",

  "invito.tocca": "Tap",
  "invito.resto":
    "to order from your table. You can then change the quantities and add a note for the kitchen.",
  "menu.vuoto": "The menu is not available yet. Please ask a member of staff.",

  "ordine.titolo": "Your order",
  "ordine.totale": "Total",
  "ordine.invia": "Order",
  "ordine.invio": "Sending…",
  "ordine.inviato": "Order sent to the kitchen.",
  "barra.articoli.uno": "item",
  "barra.articoli.molti": "items",
  "barra.vedi": "view",
  "attesa.ancora": "{tempo} to go",
  "attesa.minuti": "{n} min",
  "attesa.secondi": "{n} s",
  "errore.invio": "Could not send the order",
};

export const tTavolo = dizionario(IT, EN);
