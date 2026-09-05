> I collegamenti da fare a mano (Stripe, Resend, webhook) stanno in
> [GO-LIVE.md](GO-LIVE.md). Questa lista è il resto.

# Checklist di lancio

Ordinata per quello che blocca davvero. Le voci con ⚠️ richiedono
un'azione che solo il titolare dell'attività può fare.

## 1. Prima di far provare il sistema a un ristoratore

- [ ] **Foto vere dei piatti** — ora ci sono segnaposto illustrati. Si caricano
      da *Menu*, una per piatto, massimo 300 KB.
- [ ] **Link recensioni Google** — da *Impostazioni → Il tuo marchio*. Si prende
      dal profilo Google Business, voce "Chiedi recensioni". Finché è vuoto il
      bottone non compare (meglio assente che rotto).
- [ ] **Dati del locale** — indirizzo, telefono, P.IVA. Compaiono al cliente e
      sono richiesti dall'informativa privacy, che indica il ristorante come
      titolare del trattamento. Finché mancano, il gestionale lo segnala in
      cima a ogni pagina.
- [ ] **Allergeni su ogni piatto.** Obbligatori: la sanzione per omessa
      indicazione va da 3.000 a 24.000 € (D.Lgs. 231/2017). Il menu conta
      quanti ne mancano.
- [ ] **Conservazione dichiarata** dove il prodotto non è fresco. Ometterlo
      è frode in commercio, non una svista di stile.
- [ ] **Coperto e servizio**, se il locale li applica. Vanno dichiarati
      insieme ai prezzi, non solo in fondo al conto.
- [ ] **Stampare i QR** — da *QR e tavoli*, un PNG per tavolo.

## 2. Per incassare davvero

- [ ] ⚠️ **Sandbox Stripe rivendicata.** Finché non lo è, Connect non
      funziona: la chiave provvisoria non ha i permessi e nessun pagamento
      reale è possibile.
- [ ] ⚠️ **Account Stripe della piattaforma.** Servono le chiavi come variabili
      d'ambiente su Vercel:
      - progetto `ristoranti-guest`: `STRIPE_SECRET_KEY`,
        `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
      - progetto `ristoranti-dashboard`: `STRIPE_SECRET_KEY`
- [ ] ⚠️ **Webhook Stripe** su `https://ristoranti-guest.vercel.app/api/webhooks/stripe`,
      registrato come **Connect webhook**. Senza, un pagamento riuscito non
      chiude mai il conto: i soldi arrivano e il tavolo resta occupato.
- [ ] ⚠️ **Onboarding del locale** da *Impostazioni → Connetti Stripe*. Stripe
      chiede documenti dell'attività e IBAN; la verifica non è immediata.

Con chiavi **test** il flusso è dimostrabile subito, senza verifica.

## 3. Fatturazione elettronica (facoltativa)

- [ ] ⚠️ Account presso un intermediario SDI (Invoicetronic o compatibile) e
      API key da incollare in *Impostazioni*.
- [ ] ⚠️ **Far validare al commercialista** numerazione, regime fiscale e
      tracciato prima del primo invio reale. Sono documenti fiscali.

## 4. Collegamento alla cassa (facoltativo)

- [ ] ⚠️ Adesione al **Developer Program di Tilby**: domanda soggetta ad
      approvazione, quota di attivazione e canone mensile.
- [ ] ⚠️ **Il collegamento alla cassa oggi legge soltanto.** Importa il listino
      per costruire il menu; non invia comande, non invia incassi, non emette
      documenti fiscali. Il ristoratore deve continuare a battere lo scontrino
      sulla propria cassa. Va detto in fase di vendita: è la domanda che un
      ristoratore fa per prima.

## 5. Igiene del sistema

- [x] Password demo pubblica ruotata (era in chiaro nel repo pubblico)
- [x] `db/seed.sql` marcato come solo-sviluppo
- [x] Segreti dei locali cifrati a riposo
- [x] Pagine tavolo escluse dai motori di ricerca
- [ ] **Valutare se rendere privato il repo GitHub.** È pubblico: il codice non
      contiene segreti, ma la vecchia password demo resta nella storia dei
      commit (ormai inutile perché ruotata).
- [ ] **Cancellare "Trattoria Demo"** quando non serve più come vetrina.

## 6. Email

- [ ] ⚠️ **Chiave Resend** (`RESEND_API_KEY`, `RESEND_FROM`). Senza, nessuna
      email parte: le prenotazioni arrivano solo in gestionale e il cliente
      non riceve conferme né rifiuti. Il gestionale lo dichiara in cima alla
      pagina Prenotazioni invece di far finta di aver avvisato qualcuno.
- [ ] Facoltativo: mittente del dominio del locale, da *Impostazioni →
      Email ai clienti*. Richiede due record DNS: quasi nessun ristoratore
      lo farà, e va bene così.

## 7. Cosa manca ancora al prodotto

Nessuna di queste blocca il lancio, ma i concorrenti ce le hanno. Elenco
completo e ordinato per impatto sulla vendita in [`../HANDOFF.md`](../HANDOFF.md),
sezione 5.2. In sintesi: buoni pasto, scontrino fiscale, comanda del
cameriere, asporto, caparra anti no-show, stampa termica, fidelity,
multi-locale.

Debiti tecnici: nessun monitoraggio degli errori in produzione, nessuna
esportazione dati per i diritti degli interessati, conservazione delle
prenotazioni dichiarata ma non applicata da un job.

## Verifiche rapide dopo ogni deploy

```bash
pnpm test:e2e   # 20 test, girano anche contro produzione
```

```
https://ristoranti-guest.vercel.app/m/trattoria-da-luca   menu pubblico
https://ristoranti-dashboard.vercel.app                    gestionale
```
