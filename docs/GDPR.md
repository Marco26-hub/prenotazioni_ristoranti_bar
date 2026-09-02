# Protezione dei dati — stato reale del sistema

Documento tecnico, non di marketing. Descrive cosa il software fa davvero,
verificato nel codice. Serve a due cose: costruire il registro dei
trattamenti dell'art. 30 e rispondere a un ristoratore o a un legale che
chieda conto di come funziona.

Ultima verifica: settembre 2026.

## 1. Chi è titolare di cosa

Il punto che si sbaglia più spesso.

| Dati | Titolare | Responsabile |
|---|---|---|
| Ordini, pagamenti, prenotazioni, fatturazione dei **clienti del locale** | **Il locale** | Il fornitore della piattaforma |
| Account del personale, ragione sociale, abbonamento | **Il fornitore della piattaforma** | — |

Ne discendono due informative distinte, entrambe presenti:

- `apps/guest/src/app/privacy/[slug]/page.tsx` — per il cliente al tavolo,
  compilata con gli estremi reali del locale letti dalla banca dati.
- `apps/dashboard/src/app/privacy/page.tsx` — per il ristoratore.

E un accordo art. 28 fra i due: `apps/dashboard/src/app/dpa/page.tsx`,
versionato in `apps/dashboard/src/lib/dpa.ts`.

## 2. Registro dei trattamenti (art. 30)

| Trattamento | Categorie di dati | Interessati | Base giuridica | Conservazione | Dove sta |
|---|---|---|---|---|---|
| Ordine al tavolo | Piatti, quantità, note libere, importi | Clienti del locale | Art. 6.1.b | Con la contabilità del locale | `orders`, `order_items` |
| Pagamento | Importo, metodo, esito, id del fornitore | Clienti del locale | Art. 6.1.b | 10 anni (art. 2220 c.c.) | `payments` |
| Fatturazione elettronica | C.F. o P. IVA, codice SDI, PEC | Clienti del locale | Art. 6.1.c | 10 anni | `invoices` |
| Prenotazione | Nome, telefono, email, coperti, richieste | Clienti del locale | Art. 6.1.b | 24 mesi dalla data prenotata | `reservations` |
| Contrasto abusi | IP pseudonimizzato con HMAC | Chiunque usi i moduli pubblici | Art. 6.1.f | 2 ore | `rate_limits` |
| Account del personale | Email, nome, impronta bcrypt, ruolo | Personale del locale | Art. 6.1.b | 60 giorni dalla chiusura | `users`, `venue_staff` |
| Abbonamento | Ragione sociale, P. IVA, id cliente Stripe | Locali | Artt. 6.1.b, 6.1.c | 10 anni | `venues` |

**Categorie particolari (art. 9): nessuna prevista.** Le note libere
dell'ordine e della prenotazione sono l'unico punto in cui un cliente
potrebbe scrivere di sua iniziativa un'allergia. Il testo di entrambi i
moduli invita a parlarne a voce invece che scriverlo. Non si può impedire
del tutto, ma non si sollecita e non si indicizza.

## 3. Misure di sicurezza (art. 32) — cosa c'è davvero

- Traffico cifrato in transito; HTTPS imposto dalla piattaforma di hosting.
- Password del personale solo come impronta bcrypt (`bcryptjs`, 10 round).
- Segreti dei fornitori del locale (chiavi Satispay, API key SDI, token
  cassa) cifrati a riposo con AES-256-GCM — `packages/shared/crypto.ts`,
  formato `v1:iv:tag:ciphertext`.
- Separazione fra locali applicata a livello applicativo su ogni query
  (`requireVenue`, `requireRole` in `apps/dashboard/src/lib/authz.ts`), non
  solo nell'interfaccia. Ogni Server Action è un endpoint POST pubblico per
  chi ne conosce l'id: il controllo sta dentro l'azione.
- Ruoli: sala e cucina non accedono a incassi né dati fiscali.
- IP pseudonimizzati con HMAC-SHA256 e chiave dedicata, mai in chiaro —
  `packages/shared/rate-limit.ts`. Un SHA senza chiave sarebbe invertibile
  provando i quattro miliardi di IPv4: non sarebbe pseudonimizzazione.
- Le pagine tavolo (`/v/...`) sono escluse dai motori di ricerca: contengono
  il token del QR.
- I dati delle carte non transitano mai dai nostri sistemi (Stripe Elements,
  Satispay). Ambito PCI ridotto a SAQ A.

### Cosa manca ancora

Elencato perché serva a chiuderlo, non per rassicurare.

- **Nessun monitoraggio degli errori in produzione.** Una violazione andrebbe
  scoperta a mano. L'accordo promette notifica entro 48 ore: senza
  monitoraggio quella promessa è fragile.
- **Nessuna esportazione dei dati dalla dashboard.** L'assistenza al titolare
  per i diritti degli interessati (art. 28.3.e) oggi passa da una richiesta
  manuale.
- **Nessuna cancellazione automatica delle prenotazioni oltre i 24 mesi.** Il
  termine è dichiarato ma non ancora applicato da un job.
- **Nessuna procedura scritta di risposta alle violazioni.**
- **Registro degli accessi ai dati assente**: non si può ricostruire chi ha
  letto cosa.

## 4. Cookie

Verificato nel codice: **nessun cookie di profilazione, nessuna analitica,
nessun `localStorage`, nessun `sessionStorage`**, nessun pixel.

| Cookie | Chi | Scopo | Consenso |
|---|---|---|---|
| `__stripe_mid`, `__stripe_sid` | Stripe, solo in pagina di pagamento | Antifrode | Non richiesto (tecnico) |
| `__Secure-authjs.session-token` | Gestionale | Sessione del personale, 12 h | Non richiesto (tecnico) |

Per questo **non c'è un banner**. Introdurne uno dove non serve abitua le
persone a cliccare "accetta" senza leggere. Se si aggiunge un solo strumento
di analisi, va riscritta `apps/guest/src/app/cookie/page.tsx` e introdotto
un consenso preventivo, con rifiuto possibile senza perdita di servizio.

## 5. Trasferimenti extra UE

- Banca dati: Neon su AWS `eu-central-1`, Francoforte. I **dati** stanno
  nell'UE, ma Neon è stata acquisita da **Databricks** (giugno 2025) e la
  capogruppo è statunitense: il CLOUD Act la raggiunge anche per dati
  conservati a Francoforte. Dire "dentro l'UE" e fermarsi lì sarebbe
  fuorviante.
- Hosting applicativo: Vercel, rete globale, capogruppo statunitense.
- Pagamenti: Stripe, capogruppo statunitense.

Base: clausole contrattuali tipo e, ove applicabile, adeguatezza del quadro
UE-USA. **Da verificare con un legale prima della vendita**, insieme
all'attualità delle decisioni di adeguatezza.

### Accordi con i sotto-responsabili: già in essere

Non c'è nulla da firmare. Entrambi i DPA si attivano accettando i termini di
servizio, cosa avvenuta all'apertura degli account:

- **Vercel** — <https://vercel.com/legal/dpa>: *"This Addendum shall become
  legally binding upon Customer entering into the Agreement"*. Include le
  clausole contrattuali tipo 2021 (moduli 1, 2 e 3). Elenco sotto-responsabili
  su <https://security.vercel.com>; le modifiche si possono seguire
  scrivendo a privacy@vercel.com, con **5 giorni** per opporsi.
- **Neon / Databricks** — <https://neon.com/dpa>: incorporato nel Master Cloud
  Services Agreement, senza esecuzione separata.

Cosa fare davvero, che non è firmare:

- [ ] Salvare una copia in PDF di entrambi i DPA con la data: davanti al
      Garante serve dimostrare che la catena esiste, non che è stata firmata.
- [ ] Iscriversi alle notifiche di modifica dei sotto-responsabili di Vercel
      (privacy@vercel.com) e controllare periodicamente l'elenco Databricks.
- [ ] Tenere allineato `apps/dashboard/src/lib/dpa.ts` a quegli elenchi: è
      quello che i locali vedono, e il preavviso promesso decorre da lì.

## 6. Cosa deve fare chi vende il prodotto

- [ ] Inserire gli estremi reali del titolare in
      `apps/dashboard/src/app/privacy/page.tsx` — oggi c'è un segnaposto.
- [ ] Valutare la nomina di un DPO (art. 37). Il monitoraggio non è
      sistematico e su larga scala, quindi probabilmente non è obbligatorio,
      ma la valutazione va messa per iscritto.
- [ ] Far validare a un legale l'accordo art. 28 e le due informative.
- [ ] Conservare copia dei DPA dei sotto-responsabili (vedi §5: non vanno
      firmati, sono già vincolanti — vanno però archiviati).
- [ ] Scrivere la procedura di risposta alle violazioni, con i recapiti di
      chi decide.
- [ ] Tenere il proprio registro dei trattamenti come titolare; questo
      documento ne è la base tecnica, non il registro.

Ogni locale resta responsabile del proprio registro e della propria
valutazione: il prodotto gli fornisce l'informativa compilata e l'accordo
firmato, non lo esonera.
