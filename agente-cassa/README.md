# Agente cassa

Svuota la coda dei documenti commerciali facendoli emettere dal registratore
telematico del locale.

Gira sul computer del ristorante e non sul nostro server, per una ragione
sola: **la stampante fiscale sta sulla rete del locale e da fuori non la
raggiunge nessuno.**

## Avvio

Serve Node 20 o più recente sul computer della cassa.

```bash
RT_CODICE=<il codice generato in Corrispettivi> \
RT_STAMPANTE=192.168.1.50 \
node agente.mjs
```

Per provarlo senza stampare niente:

```bash
RT_CODICE=… RT_PROVA=1 node agente.mjs
```

Stampa a schermo il tracciato che uscirebbe. **Fallo prima**, e confronta il
tracciato con il manuale della tua stampante.

## Quanto costa tenerlo acceso

L'agente chiede al gestionale se c'è qualcosa da stampare. Ogni richiesta si
paga, e la coda è vuota quasi sempre: di notte, a locale chiuso, non c'è
niente da fare.

Per questo il ritmo si adatta. Quando c'è lavoro controlla ogni **3 secondi**;
dopo cinque giri a vuoto rallenta a **30**. Un documento fiscale non ha fretta
al secondo — nessuno aspetta davanti alla stampante — e appena ne compare uno
torna svelto, perché i conti si chiudono a ondate.

A locale fermo sono **2.880 richieste al giorno invece di 17.280**.

Se vuoi cambiarli:

```bash
RT_ATTESA=3        # secondi quando c'è lavoro
RT_ATTESA_FERMO=30 # secondi quando è fermo
```

## Da sapere prima di usarlo in servizio

Il tracciato XML qui dentro è quello delle **Epson fiscali** (`fpmate.cgi`), la
marca più diffusa nei locali italiani. **Non è stato provato su una stampante
vera**: il dialetto va confrontato con il manuale del modello che hai.

Custom e RCH parlano diverso. Per cambiarli si tocca una funzione sola —
`documentoXml` — e il resto del programma non sa cosa sia una stampante.

## Cosa succede se

**Lo spegni**: la coda resta nel gestionale e riparte da dov'era.

**Lo accendi su due computer**: i documenti non escono due volte. È il
gestionale a consegnarli uno solo per volta, e a riprenderli in mano se un
agente muore a metà.

**La stampante rifiuta un documento**: l'agente lo riporta come non riuscito,
e nel gestionale compare in rosso con il motivo. Dopo cinque tentativi smette
di riprovare: a quel punto è un guasto e va guardato da una persona.

**Il codice non funziona più**: qualcuno ne ha generato uno nuovo nel
gestionale, e il vecchio non vale più. È il modo di togliere l'accesso a un
computer che non c'è più.

## Farlo partire da solo

Su Windows, Utilità di pianificazione, all'accesso. Su Linux, un servizio
systemd. Su macOS, un `launchd`. Quello che conta è che riparta da solo dopo
un riavvio: un agente spento è indistinguibile da una coda vuota, finché non
ci si accorge che non esce più niente — e nel gestionale, in Corrispettivi,
c'è scritto da quando la cassa non si fa sentire.
