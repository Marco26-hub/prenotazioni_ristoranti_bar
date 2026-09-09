# WhatsApp e confronto con Aurora AI

Aggiornato il 9 settembre 2026.

## Stato attuale

Il pulsante WhatsApp della landing apre una chat verso `+39 347 719 6603`
con un testo precompilato tramite `wa.me`. È utile come contatto commerciale,
ma non è un'integrazione WhatsApp Business: il gestionale oggi non invia
automaticamente conferme, promemoria o numeri di ritiro e non riceve stati di
consegna, lettura o risposte.

## Integrazione consigliata

1. Ogni ristorante collega un numero WhatsApp Business verificato tramite
   Meta Cloud API o un BSP come Twilio.
2. La prenotazione registra consenso, numero normalizzato e preferenza di
   contatto.
3. Template `utility` approvati inviano conferma, promemoria, modifica,
   cancellazione e ordine pronto.
4. I link di modifica sono firmati, scadono e agiscono direttamente sulla
   prenotazione corretta.
5. Un webhook riceve risposte e stati `sent`, `delivered`, `read`, `failed`.
6. Una coda transazionale con idempotenza e retry impedisce a un errore di
   WhatsApp di bloccare una prenotazione o un ordine.
7. L'admin mostra cronologia, stato, errore e possibilità di reinvio.

WhatsApp apre una finestra di assistenza di 24 ore dopo un messaggio del
cliente; fuori da quella finestra servono template approvati. Servono inoltre
un WhatsApp Business Account e la verifica dell'azienda. Riferimenti:
[concetti WhatsApp di Twilio](https://www.twilio.com/docs/whatsapp/key-concepts)
e [webhook/stati API](https://www.twilio.com/docs/whatsapp/api).

La prima versione deve essere transazionale e deterministica. L'assistente AI
telefonico può arrivare dopo come add-on a consumo: non va messo nel percorso
critico di ordine, pagamento o prenotazione.

## Aurora AI

Aurora è centrata sul telefono: prenotazioni vocali, asporto e delivery, con
conferme e modifiche WhatsApp. Il listino pubblico indica Base a 49 euro/mese,
Starter a 247 euro, Professional a 397 euro ed Enterprise a 647 euro, IVA
esclusa. Include 300 messaggi WhatsApp al mese; i minuti telefonici eccedenti
costano 0,30 euro/minuto. Fonte: [prezzi Aurora AI](https://aurora-ai.it/prezzi/).

Aurora è oggi più forte di noi nella risposta telefonica automatica e nel
flusso WhatsApp già confezionato. Il nostro prodotto è più profondo dentro il
locale: menu QR, ordine e pagamento al tavolo, conto diviso, documenti
fiscali, cucina/sala, formula all-you-can-eat e numeri di ritiro. Nelle pagine
pubbliche consultate Aurora non presenta un flusso equivalente di pagamento
al tavolo, divisione conto e fatturazione dal QR.

Non è quindi migliore in assoluto: risolve soprattutto il problema del
telefono, mentre questo progetto risolve il servizio e l'incasso. La scelta
più forte è colmare conferme e modifiche WhatsApp senza imitare subito la
parte vocale più costosa.

## Posizionamento e prezzo ritiro

Il nuovo piano `Ordina e ritira` costa 129 euro/mese o 1.290 euro/anno, IVA
esclusa. Include il nucleo ordini più numeri progressivi, schermo banco e
metodi di chiamata. Il confronto con i 397 euro/mese del piano Aurora che
include asporto non è perfettamente omogeneo, perché Aurora comprende anche
l'assistente telefonico: il nostro prezzo è intenzionalmente più basso e
orientato all'operatività nel locale.

Il checkout del nuovo piano richiede due Price Stripe e l'aggiunta delle
relative chiavi a `STRIPE_PRICES` in produzione. Finché la variabile non viene
aggiornata, il gestionale mostra correttamente che il listino del piano non è
configurato e non inventa un prezzo in checkout.
