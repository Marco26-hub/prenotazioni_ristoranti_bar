# Perché le funzioni girano a Francoforte

`apps/*/vercel.json` dichiara `"regions": ["fra1"]`. È una riga, e vale più
di qualunque ottimizzazione del codice fatta finora.

## Il numero

Il database Neon sta a **Francoforte** (`eu-central-1`). Senza questa riga
Vercel esegue le funzioni nella sua regione predefinita, che è negli Stati
Uniti: ogni query diventa un giro transatlantico.

Misurato il 6 settembre 2026 sulla produzione, prima della modifica:

| Cosa | Tempo |
|---|---|
| Richiesta che fa **una** query (sessione inesistente, 404) | 580 ms |
| Richiesta del conto, che ne faceva **tredici** | 1 450 ms |

La differenza fra le due dice quanto costa una query: circa **72 ms**. Sulla
stessa macchina in locale, con lo stesso database, la stessa richiesta ne
impiega 325 — perché lì il giro costa due millisecondi.

## Perché conta proprio qui

Il conto è la pagina che ogni telefono seduto al tavolo richiede **ogni
cinque secondi**. Con venti telefoni aperti in un all you can eat sono
quattromila richieste all'ora, ognuna delle quali aspettava più di un secondo
per dei numeri che quasi mai erano cambiati. Si pagava due volte: in attesa
per chi mangia, e in durata delle funzioni sulla bolletta Vercel.

## La lezione, per chi ottimizzerà il prossimo pezzo

Lo stesso giorno era stata tolta una quadruplicazione del calcolo del conto —
quattro chiamate a `contoSessione`, tredici query invece di quattro. Misurata
**in locale** sembrava non servire a niente: 330 ms prima, 325 dopo.
Misurata dove gira davvero valeva circa 650 ms.

**Una misura presa vicino al database non dice niente su un codice che gira
lontano.** Se una modifica riguarda il numero di query, va misurata in
produzione, o non è stata misurata.
