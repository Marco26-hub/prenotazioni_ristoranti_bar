# Le lingue

Il software parla **italiano e inglese**. Il *menu* può parlarne dieci. Sono
due sistemi diversi e la differenza è tutta qui:

| | Chi lo scrive | Quante lingue | Dove sta |
|---|---|---|---|
| **Interfaccia** — pulsanti, errori, etichette | noi | 2: IT, EN | `packages/shared/i18n/` |
| **Contenuto** — nomi dei piatti, descrizioni | il ristoratore | 10 | `packages/shared/lingue.ts` |

Confonderli è l'errore che si fa. Un pulsante tradotto male fa sbagliare un
pagamento; un nome di piatto tradotto male fa sorridere. Per questo
l'interfaccia ha due lingue curate invece di dieci approssimative.

## Come si sceglie la lingua

**Al tavolo** (nessun account): il link `?lang=` batte il cookie, che batte
la lingua del telefono, che batte l'italiano. Il caso che conta è l'ultimo:
un turista inquadra il QR e trova l'inglese senza toccare niente. Se deve
cercare il selettore, il selettore ha già fallito.

**Nel gestionale** (c'è un account): la preferenza salvata su
`users.lingua_ui` batte tutto, poi il cookie, poi il browser. Sta
sull'utente e non sul locale perché in un locale a gestione straniera il
titolare può volerlo in inglese e il cameriere in italiano, sullo stesso
locale.

**Nelle email**: la conferma parte mentre il cliente è collegato, quindi la
lingua si legge dalla richiesta. Il promemoria del giorno prima lo manda un
cron alle nove del mattino, quando header e cookie non esistono più: per
quello la lingua è salvata su `reservations.lingua`, presa dal modulo che il
cliente ha compilato.

## Il ponte fra i due sistemi

`linguaContenuto(ui, disponibili)` — se l'interfaccia è in inglese e il
locale ha tradotto il menu in inglese, i piatti vanno in inglese. Un cliente
che legge "Add to order" sotto "Tagliata di manzo" ha metà pagina che non
capisce.

`linguaUIPerContenuto(codice)` — chi chiede il menu in tedesco ha
l'interfaccia in inglese, non in italiano: è la lingua che capisce di più fra
quelle che abbiamo.

## Come si aggiunge una stringa

```ts
const IT = { "carrello.vuoto": "Il carrello è vuoto" };
const EN: Speculare<typeof IT> = { "carrello.vuoto": "Your order is empty" };
export const tCarrello = dizionario(IT, EN);
```

`Speculare` non fa compilare un dizionario a cui manca una chiave inglese.
È un tipo e non un controllo a runtime apposta: la chiave dimenticata deve
rompere la build, non comparire in italiano dentro una frase inglese davanti
al cliente.

Le **chiavi restano italiane** (`carrello.vuoto`): sono nomi di variabili,
come il resto del codice. I **commenti restano italiani**: sono per chi
scrive il codice, non per il cliente.

## Quello che non si traduce

- **I termini fiscali italiani**: Partita IVA, Codice Destinatario, SDI,
  documento commerciale, corrispettivi, Registratore Telematico. Sono nomi di
  istituti e di portali reali. Un commercialista che legge "VAT number" e poi
  deve compilare un campo che dice "Partita IVA" si blocca. In inglese si
  lasciano tali e quali, con la spiegazione fra parentesi la prima volta.
- **I testi che ha scritto il ristoratore** (`TESTI_PUBBLICI`). Se ha scritto
  la sua presentazione in italiano, un inglese la legge in italiano: è la sua
  voce, e una traduzione automatica della presentazione di un locale è peggio
  della presentazione in italiano. Traduciamo solo il *ripiego*, che è nostro.
- **I testi legali**, nel senso che l'italiano fa fede. La traduzione inglese
  c'è per farli capire, e lo dice.

## Gli allergeni

I quattordici nomi inglesi seguono l'**Allegato II del Reg. UE 1169/2011
nella sua versione inglese ufficiale**, non una traduzione libera. "Cereals
containing gluten", non "Gluten". Chi è allergico cerca esattamente quella
formula, ed è quella che regge a un controllo.

L'italiano resta comunque disponibile: è la lingua in cui il consumatore in
Italia deve poter leggere. L'inglese si aggiunge, non sostituisce.
