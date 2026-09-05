# Go live — cosa devi collegare tu

Il codice è pronto e già in produzione: ogni push si rilascia da solo su
Vercel. Quello che manca sono cinque collegamenti che passano da chiavi
tue, e che nessun altro può fare al posto tuo.

L'ordine conta. Ogni passo ha come verificarlo: non passare al successivo
senza aver visto la prova.

---

## 1. Stripe in modalità Live

Sul cruscotto Stripe, interruttore **Test → Live** in alto. Poi
**Sviluppatori → Chiavi API**.

Su Vercel, progetto **ristoranti-guest**, ambiente **Production**:

| Variabile | Valore |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` |

Su **ristoranti-dashboard**, stesso `STRIPE_SECRET_KEY` (`sk_live_…`).

> Oggi sono entrambe `sk_test_` / `pk_test_`: un cliente che paga al tavolo
> non muove un euro, e il conto risulta comunque saldato.

**Verifica**: nel cruscotto Stripe, sezione Pagamenti, deve sparire la
fascia arancione "dati di test".

---

## 2. Due webhook, due segreti diversi

Sono due cose distinte e confonderle è il primo errore che si fa.

**Webhook A — gli incassi dei locali**
- URL: `https://ristoranti-guest.vercel.app/api/webhooks/stripe`
- Eventi: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Il signing secret (`whsec_…`) va in **ristoranti-guest** →
  `STRIPE_WEBHOOK_SECRET`

**Webhook B — gli abbonamenti che i locali pagano a te**
- URL: `https://ristoranti-dashboard.vercel.app/api/webhooks/billing`
- Eventi: `customer.subscription.created`, `.updated`, `.deleted`,
  `invoice.paid`
- Il suo signing secret va in **ristoranti-dashboard** →
  `STRIPE_BILLING_WEBHOOK_SECRET`

**Verifica**: dal cruscotto Stripe, "Invia evento di prova" su ciascuno.
Deve rispondere 200. Un 400 significa segreto sbagliato o scambiato.

---

## 3. Il metadata `moduli` su ogni Price

Per ogni Price del listino, **Metadata → aggiungi**:

```
moduli = ordini
moduli = prenotazioni
moduli = ordini,prenotazioni
```

Senza, il locale paga e si ritrova l'abbonamento "Attivo" con **niente
attivo**: al primo cliente che inquadra il QR legge che l'ordine al tavolo
non è disponibile. Il codice ora non azzera più i moduli quando il metadata
manca e lo scrive nei log, ma il campo va messo lo stesso.

**Verifica**: fai un abbonamento di prova e controlla che in
`/dashboard/billing` compaiano i moduli giusti.

---

## 4. Resend

Serve un **dominio verificato**: Resend rifiuta gmail.com e qualunque
dominio che non controlli.

1. Resend → Domains → aggiungi il tuo dominio, metti i record DNS che ti dà
2. Aspetta che risulti *Verified*
3. API Keys → creane una

Su **entrambi** i progetti Vercel, ambiente Production:

| Variabile | Esempio |
|---|---|
| `RESEND_API_KEY` | `re_…` |
| `RESEND_FROM` | `Nome Locale <prenotazioni@tuodominio.it>` |

> Finché manca, **nessuna email parte**: né la conferma di prenotazione, né
> il promemoria del giorno prima, né la disdetta, né la fattura al cliente.
> Il cron gira lo stesso e marca le righe come inviate.

**Verifica**: Impostazioni → Email ai clienti → "Manda una prova". Deve
arrivare.

---

## 5. Fatturazione elettronica (solo se la vendi)

Su **ristoranti-guest**: `INVOICETRONIC_WEBHOOK_SECRET`, dal cruscotto
Invoicetronic.

Senza, nessuna notifica di stato viene accettata e ogni fattura resta
"Inviata a SDI" per sempre — anche se lo SDI l'ha scartata. La lista lo
segnala dopo due giorni, ma è un cerotto.

La chiave API dell'intermediario la mette ogni locale nelle proprie
impostazioni: è sua, non tua.

---

## 6. Il giro vero, prima di aprire a un cliente

I 58 test automatici girano contro la produzione, ma **con Stripe in test**:
il percorso dei soldi veri non l'ha ancora attraversato nessuno.

Su un tavolo di prova, con una carta vera:

- [ ] inquadra il QR, ordina due piatti con una variante
- [ ] paga con carta — controlla che l'importo arrivi su Stripe **Live**
- [ ] paga alla romana da due telefoni diversi
- [ ] chiedi la fattura dal tavolo e verifica che parta allo SDI
- [ ] paga in contanti: "chiama il cameriere" deve arrivare in sala
- [ ] prenota dalla pagina pubblica, poi disdici dal link nell'email
- [ ] chiudi il tavolo dalla cassa e controlla che l'incasso torni

---

## Quello che il sistema NON fa, e va detto al cliente

**Non sostituisce il registratore telematico.** Il gestionale incassa, ma il
documento commerciale il locale continua a batterlo sulla sua cassa: è
doppia digitazione, ed è la prima domanda che ti faranno. Non dire di sì:
chi lo fa perde il cliente al primo controllo. L'integrazione RT è la
prossima cosa da costruire.

**Non funziona senza linea.** È una scelta: il menu vive su internet, non su
un computer in sala. In cambio il titolare lo vede da casa, si incassa con
carta, e un secondo locale non richiede un secondo server.

---

## Quando qualcosa non va

| Sintomo | Dove guardare |
|---|---|
| Nessuna email | `RESEND_API_KEY` e `RESEND_FROM` su **entrambi** i progetti |
| "Pagamento non disponibile" al tavolo | chiave Stripe pubblica mancante o di test |
| Abbonamento attivo ma niente funziona | metadata `moduli` sul Price |
| Fatture ferme su "Inviata a SDI" | `INVOICETRONIC_WEBHOOK_SECRET` |
| I promemoria non partono | `CRON_SECRET` (già impostato) e i log del cron |
| QR che non aprono niente | `GUEST_APP_URL` sul progetto dashboard |
