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
      titolare del trattamento.
- [ ] **Stampare i QR** — da *QR e tavoli*, un PNG per tavolo.

## 2. Per incassare davvero

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
      approvazione, quota di attivazione e canone mensile. Il codice è pronto
      ma non è mai stato provato contro una cassa reale.

## 5. Igiene del sistema

- [x] Password demo pubblica ruotata (era in chiaro nel repo pubblico)
- [x] `db/seed.sql` marcato come solo-sviluppo
- [x] Segreti dei locali cifrati a riposo
- [x] Pagine tavolo escluse dai motori di ricerca
- [ ] **Valutare se rendere privato il repo GitHub.** È pubblico: il codice non
      contiene segreti, ma la vecchia password demo resta nella storia dei
      commit (ormai inutile perché ruotata).
- [ ] **Cancellare "Trattoria Demo"** quando non serve più come vetrina.

## 6. Cosa manca ancora al prodotto

Nessuna di queste blocca il lancio, ma i concorrenti ce le hanno:

- Fidelizzazione clienti, upselling durante l'ordine, analytics di conversione
- Controllo capienza sulle prenotazioni (oggi si può prenotare più dei posti)
- Prenotazione online per il cliente (oggi la inserisce lo staff)
- Recupero password via email (serve un provider email)
- Nessun monitoraggio degli errori in produzione (niente Sentry o simili)

## Verifiche rapide dopo ogni deploy

```bash
pnpm test:e2e   # 20 test, girano anche contro produzione
```

```
https://ristoranti-guest.vercel.app/m/trattoria-da-luca   menu pubblico
https://ristoranti-dashboard.vercel.app                    gestionale
```
