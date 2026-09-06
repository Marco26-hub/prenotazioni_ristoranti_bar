import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * Personale, permessi, dispositivi e assistenza.
 *
 * Le parole di questa area le legge chi assume e chi toglie l'accesso: il
 * titolare, quasi sempre da solo, il lunedì mattina. Sono decisioni che si
 * prendono una volta e restano — un ruolo sbagliato non si vede finché
 * qualcuno non tocca quello che non doveva.
 *
 * Sull'inglese: i nomi dei ruoli sono quelli del mestiere, non del
 * vocabolario. "Front of house" e "Kitchen" perché il codice distingue sala
 * e cucina; "Section" per il rango, che è l'insieme dei tavoli di un
 * cameriere; "Station" per il reparto, che è il posto dove si prepara.
 *
 * I valori a database (owner, manager, waiter, kitchen, cucina, bar…) non si
 * traducono: qui si traduce solo l'etichetta che ci sta sopra.
 */

const IT = {
  // Comuni all'area
  "errore.nessun_locale": "Nessun locale associato.",

  // Ruoli — le etichette; i valori owner/manager/waiter/kitchen restano
  "ruolo.owner": "Titolare",
  "ruolo.manager": "Responsabile",
  "ruolo.waiter": "Sala",
  "ruolo.kitchen": "Cucina",

  // Pagina personale
  "personale.titolo": "Personale",
  "personale.solo_titolare": "Solo il titolare può gestire gli accessi del personale.",
  "personale.titolo.completo": "Personale e dispositivi",
  "personale.sottotitolo":
    "Chi può entrare, cosa può toccare, e su quali schermi gira il servizio.",

  // Come funzionano i permessi
  "permessi.titolo": "Come funzionano i permessi",
  "permessi.ruolo": "Ruolo",
  "permessi.ruolo.a": "cosa può dichiarare. La cucina segna",
  "permessi.ruolo.pronto": "pronto",
  "permessi.ruolo.b": ", la sala segna",
  "permessi.ruolo.servito": "servito",
  "permessi.ruolo.c":
    ": farle dire a chiunque svuota entrambe. Titolare e responsabile fanno tutto.",
  "permessi.rango": "Rango",
  "permessi.rango.testo":
    "quali tavoli vede per primi sul palmare. È una vista, non un divieto: con un tocco passa a tutta la sala se un tavolo altrui chiama.",
  "permessi.reparti": "Reparti",
  "permessi.reparti.testo":
    "su cosa può agire davvero. Un barista senza il reparto cucina vede i primi ma non può spostarli. Nessuna spunta significa tutti.",
  "permessi.dispositivo": "Dispositivo",
  "permessi.dispositivo.testo":
    "cosa mostra quello schermo. Appartiene al monitor, non alla persona.",

  // Schermi
  "schermi.titolo": "Schermi in servizio",
  "schermi.sottotitolo": "I monitor che stanno lavorando adesso e su cosa sono impostati.",

  // Aggiungi persona
  "aggiungi.titolo": "Aggiungi una persona",
  "aggiungi.sottotitolo":
    "Scegli tu una password e comunicagliela: potrà cambiarla da Impostazioni al primo accesso. Non inviamo ancora email di invito.",
  "aggiungi.nome": "Nome (facoltativo)",
  "aggiungi.email": "Email",
  "aggiungi.password": "Password iniziale (min 8 caratteri)",
  "aggiungi.creato": "Accesso creato per {email}. Comunicagli la password.",
  "aggiungi.creazione": "Creazione...",
  "aggiungi.crea": "Crea accesso",

  // Cosa può fare ogni ruolo
  "ruoli.titolo": "Cosa può fare ogni ruolo",
  "ruoli.e": "e",
  "ruoli.owner.testo":
    "tutto, compresi pagamenti, dati fiscali e gestione del personale.",
  "ruoli.manager.testo":
    "menu, tavoli, dati fiscali e pagamenti. Non gestisce il personale.",
  "ruoli.sala_cucina.testo":
    "ordini, prenotazioni e disponibilità dei piatti. Non toccano pagamenti né dati fiscali.",

  // Elenco del personale
  "elenco.tu": "(tu)",
  "elenco.rimuovi": "Rimuovi",

  // Rango e reparti
  "rango.assegna": "Assegna tavoli",
  "rango.riepilogo": "Rango: {tavoli}",
  "rango.riepilogo.reparti": "reparti: {reparti}",
  "rango.riepilogo.codice": "codice {codice}",
  "rango.tavoli_di": "Tavoli di {nome}",
  "rango.spiegazione":
    "Vedrà per primi questi sul palmare. Può comunque agire su tutta la sala se serve dare una mano.",
  "rango.assegnato": "assegnato",
  "rango.nessun_tavolo": "Nessun tavolo in sala. Creane dalla pianta in Tavoli.",
  "rango.reparti.titolo": "Reparti su cui può operare",
  "rango.reparti.spiegazione":
    "Nessuna spunta = tutti. Fuori dai suoi reparti vede le comande ma non può spostarle.",
  "rango.codice.etichetta": "Codice operatore",
  "rango.codice.spiegazione":
    "Da 4 a 6 cifre, per entrare in fretta dal tablet condiviso senza ridigitare email e password a ogni cambio. Vuoto: entra con la password. Titolare e responsabile non lo possono avere — quattro cifre non difendono un pannello che vede il fatturato.",
  "rango.codice.esempio": "es. 4071",
  "rango.salvo": "Salvo…",
  "rango.salva": "Salva accessi",
  "rango.annulla": "Annulla",

  // Messaggi delle azioni sul personale
  "azione.email_non_valida": "Email non valida",
  "azione.password_corta": "La password deve essere di almeno 8 caratteri",
  "azione.ruolo_non_valido": "Ruolo non valido",
  "azione.email_esistente": "Esiste già un account con questa email",
  "azione.membro_non_trovato": "Membro non trovato",
  "azione.non_rimuovere_te": "Non puoi rimuovere te stesso",
  "azione.almeno_un_titolare": "Deve restare almeno un titolare",
  "azione.non_cambiare_te": "Non puoi cambiare il tuo stesso ruolo",
  "azione.non_del_locale": "Questa persona non fa parte del locale",
  "azione.rango_svuotato": "Rango svuotato.",
  "azione.tavoli_assegnati.uno": "{n} tavolo assegnato.",
  "azione.tavoli_assegnati.molti": "{n} tavoli assegnati.",
  "azione.tutti_i_reparti": "Può operare su tutti i reparti.",
  "azione.opera_su": "Opera su: {reparti}.",
  "azione.codice_rimosso": "Codice rimosso: entrerà con email e password.",
  "azione.codice_vietato":
    "Titolare e responsabile entrano con la password: il codice non protegge incassi e dati fiscali.",
  "azione.codice_cifre": "Il codice è da 4 a 6 cifre",
  "azione.codice_facile": "Codice troppo facile da indovinare: cambialo",
  "azione.codice_occupato": "Questo codice è già di un'altra persona",
  "azione.codice_assegnato": "Codice {codice} assegnato.",

  // Dispositivi — etichette dei reparti; le chiavi restano a database
  "reparto.cucina": "Cucina",
  "reparto.bar": "Bar",
  "reparto.pizzeria": "Pizzeria",
  "reparto.pasticceria": "Pasticceria",

  "dispositivi.vuoto":
    "Nessuno schermo si è ancora presentato. Apri {ordini} sul tablet della cucina o del bar: comparirà qui, e potrai dargli un nome.",
  "dispositivi.ordini": "Ordini",
  "dispositivi.senza_nome": "Schermo senza nome",
  "dispositivi.mostra": "Mostra:",
  "dispositivi.tutti_i_reparti": "tutti i reparti",
  "dispositivi.ultimo_accesso": " · ultimo accesso di {utente}",
  "dispositivi.nome.placeholder": "Tablet cucina",
  "dispositivi.nome.etichetta": "Nome del dispositivo",
  "dispositivi.salva": "Salva",
  "dispositivi.dimentica": "Dimentica",
  "dispositivi.nota.a": "Il reparto lo sceglie lo schermo stesso, da",
  "dispositivi.nota.b":
    ": è una proprietà del monitor, non della persona, così il tablet del bar resta sul bar anche quando ci passa qualcun altro. Qui lo vedi e dai un nome per riconoscerlo.",
  "dispositivi.nota.c": "lo toglie dall'elenco ma non lo disconnette: se è ancora in uso ricompare.",

  // Da quanto non si fa vivo
  "visto.mai": "—",
  "visto.adesso": "in servizio adesso",
  "visto.minuti": "visto {n} min fa",
  "visto.ore": "visto {n} h fa",
  "visto.giorni.uno": "visto {n} giorno fa",
  "visto.giorni.molti": "visto {n} giorni fa",

  // Messaggi delle azioni sui dispositivi
  "dispositivo.non_trovato": "Dispositivo non trovato",
  "dispositivo.rinominato": 'Rinominato in "{nome}".',
  "dispositivo.nome_rimosso": "Nome rimosso.",
  "dispositivo.dimenticato": "Rimosso dall'elenco. Se è ancora in uso ricomparirà.",

  // Assistenza
  "assistenza.titolo": "Assistenza",
  "assistenza.sottotitolo":
    "Scrivi qui invece che su WhatsApp: la richiesta resta, e la risposta la trovi in questa pagina anche fra una settimana.",
  "assistenza.tue_richieste": "Le tue richieste",
  "assistenza.risposta": "Risposta",
  "assistenza.stato.aperto": "In attesa",
  "assistenza.stato.in_corso": "Ci stiamo lavorando",
  "assistenza.stato.risolto": "Risolta",
  "assistenza.oggetto": "Di cosa si tratta",
  "assistenza.oggetto.placeholder": "Le comande non arrivano in cucina",
  "assistenza.messaggio": "Raccontaci cosa succede",
  "assistenza.messaggio.placeholder":
    "Da stamattina il tablet del bar non riceve più niente. Ho provato a ricaricare.",
  "assistenza.urgenza": "Blocca il servizio adesso",
  "assistenza.invio": "Invio…",
  "assistenza.invia": "Invia richiesta",
  "assistenza.errore.campi": "Scrivi oggetto e messaggio",
  "assistenza.ok.aggiunta_urgente":
    "Aggiunto alla richiesta che avevi già aperto, segnalata come urgente.",
  "assistenza.ok.aggiunta":
    "Aggiunto alla richiesta che avevi già aperto: la stiamo guardando.",
  "assistenza.ok.inviata": "Richiesta inviata. Ti rispondiamo qui dentro.",
};

const EN: Speculare<typeof IT> = {
  "errore.nessun_locale": "No venue linked to this account.",

  "ruolo.owner": "Owner",
  "ruolo.manager": "Manager",
  "ruolo.waiter": "Front of house",
  "ruolo.kitchen": "Kitchen",

  "personale.titolo": "Staff",
  "personale.solo_titolare": "Only the owner can manage staff access.",
  "personale.titolo.completo": "Staff and devices",
  "personale.sottotitolo":
    "Who can log in, what they can touch, and which screens the service runs on.",

  "permessi.titolo": "How permissions work",
  "permessi.ruolo": "Role",
  "permessi.ruolo.a": "what they can call. The kitchen marks",
  "permessi.ruolo.pronto": "ready",
  "permessi.ruolo.b": ", the floor marks",
  "permessi.ruolo.servito": "served",
  "permessi.ruolo.c":
    ": letting anyone mark both empties them of meaning. Owner and manager do everything.",
  "permessi.rango": "Section",
  "permessi.rango.testo":
    "which tables they see first on the handheld. It's a view, not a lock: one tap switches to the whole floor if someone else's table calls.",
  "permessi.reparti": "Stations",
  "permessi.reparti.testo":
    "what they can actually act on. A bartender without the kitchen station sees the pasta course but can't move it along. No ticks means all of them.",
  "permessi.dispositivo": "Device",
  "permessi.dispositivo.testo":
    "what that screen shows. It belongs to the monitor, not to the person.",

  "schermi.titolo": "Screens on service",
  "schermi.sottotitolo": "The monitors working right now and what they are set to.",

  "aggiungi.titolo": "Add someone",
  "aggiungi.sottotitolo":
    "Pick a password yourself and tell it to them: they can change it from Settings the first time they log in. We don't send invitation emails yet.",
  "aggiungi.nome": "Name (optional)",
  "aggiungi.email": "Email",
  "aggiungi.password": "Initial password (min. 8 characters)",
  "aggiungi.creato": "Access created for {email}. Tell them the password.",
  "aggiungi.creazione": "Creating...",
  "aggiungi.crea": "Create access",

  "ruoli.titolo": "What each role can do",
  "ruoli.e": "and",
  "ruoli.owner.testo":
    "everything, including payments, tax data and staff management.",
  "ruoli.manager.testo":
    "menu, tables, tax data and payments. Does not manage staff.",
  "ruoli.sala_cucina.testo":
    "orders, bookings and dish availability. They touch neither payments nor tax data.",

  "elenco.tu": "(you)",
  "elenco.rimuovi": "Remove",

  "rango.assegna": "Assign tables",
  "rango.riepilogo": "Section: {tavoli}",
  "rango.riepilogo.reparti": "stations: {reparti}",
  "rango.riepilogo.codice": "code {codice}",
  "rango.tavoli_di": "{nome}'s tables",
  "rango.spiegazione":
    "They will see these first on the handheld. They can still act on the whole floor when someone needs a hand.",
  "rango.assegnato": "assigned",
  "rango.nessun_tavolo": "No tables on the floor. Create some from the plan in Tables.",
  "rango.reparti.titolo": "Stations they can work on",
  "rango.reparti.spiegazione":
    "No ticks = all of them. Outside their stations they see the tickets but can't move them.",
  "rango.codice.etichetta": "Operator code",
  "rango.codice.spiegazione":
    "4 to 6 digits, to log in fast on a shared tablet without retyping email and password at every handover. Empty: they log in with the password. Owner and manager can't have one — four digits don't protect a panel that shows the takings.",
  "rango.codice.esempio": "e.g. 4071",
  "rango.salvo": "Saving…",
  "rango.salva": "Save access",
  "rango.annulla": "Cancel",

  "azione.email_non_valida": "Invalid email",
  "azione.password_corta": "The password must be at least 8 characters",
  "azione.ruolo_non_valido": "Invalid role",
  "azione.email_esistente": "An account with this email already exists",
  "azione.membro_non_trovato": "Staff member not found",
  "azione.non_rimuovere_te": "You can't remove yourself",
  "azione.almeno_un_titolare": "At least one owner must remain",
  "azione.non_cambiare_te": "You can't change your own role",
  "azione.non_del_locale": "This person is not part of the venue",
  "azione.rango_svuotato": "Section cleared.",
  "azione.tavoli_assegnati.uno": "{n} table assigned.",
  "azione.tavoli_assegnati.molti": "{n} tables assigned.",
  "azione.tutti_i_reparti": "They can work on every station.",
  "azione.opera_su": "Works on: {reparti}.",
  "azione.codice_rimosso": "Code removed: they will log in with email and password.",
  "azione.codice_vietato":
    "Owner and manager log in with the password: the code does not protect takings and tax data.",
  "azione.codice_cifre": "The code must be 4 to 6 digits",
  "azione.codice_facile": "Code too easy to guess: change it",
  "azione.codice_occupato": "This code already belongs to someone else",
  "azione.codice_assegnato": "Code {codice} assigned.",

  "reparto.cucina": "Kitchen",
  "reparto.bar": "Bar",
  "reparto.pizzeria": "Pizza station",
  "reparto.pasticceria": "Pastry station",

  "dispositivi.vuoto":
    "No screen has checked in yet. Open {ordini} on the kitchen or bar tablet: it will show up here, and you can give it a name.",
  "dispositivi.ordini": "Orders",
  "dispositivi.senza_nome": "Unnamed screen",
  "dispositivi.mostra": "Shows:",
  "dispositivi.tutti_i_reparti": "every station",
  "dispositivi.ultimo_accesso": " · last logged in by {utente}",
  "dispositivi.nome.placeholder": "Kitchen tablet",
  "dispositivi.nome.etichetta": "Device name",
  "dispositivi.salva": "Save",
  "dispositivi.dimentica": "Forget",
  "dispositivi.nota.a": "The screen picks its own station, from",
  "dispositivi.nota.b":
    ": it is a property of the monitor, not of the person, so the bar tablet stays on the bar even when someone else takes over. Here you see it and name it so you can tell it apart.",
  "dispositivi.nota.c": "takes it off the list but does not disconnect it: if it is still in use it comes back.",

  "visto.mai": "—",
  "visto.adesso": "on service now",
  "visto.minuti": "seen {n} min ago",
  "visto.ore": "seen {n} h ago",
  "visto.giorni.uno": "seen {n} day ago",
  "visto.giorni.molti": "seen {n} days ago",

  "dispositivo.non_trovato": "Device not found",
  "dispositivo.rinominato": 'Renamed to "{nome}".',
  "dispositivo.nome_rimosso": "Name removed.",
  "dispositivo.dimenticato": "Removed from the list. If it is still in use it will come back.",

  "assistenza.titolo": "Support",
  "assistenza.sottotitolo":
    "Write here instead of on WhatsApp: the request stays, and you'll find the answer on this page even a week later.",
  "assistenza.tue_richieste": "Your requests",
  "assistenza.risposta": "Answer",
  "assistenza.stato.aperto": "Waiting",
  "assistenza.stato.in_corso": "We're on it",
  "assistenza.stato.risolto": "Resolved",
  "assistenza.oggetto": "What is it about",
  "assistenza.oggetto.placeholder": "Orders aren't reaching the kitchen",
  "assistenza.messaggio": "Tell us what is happening",
  "assistenza.messaggio.placeholder":
    "Since this morning the bar tablet hasn't been receiving anything. I tried reloading.",
  "assistenza.urgenza": "This is blocking service right now",
  "assistenza.invio": "Sending…",
  "assistenza.invia": "Send request",
  "assistenza.errore.campi": "Write a subject and a message",
  "assistenza.ok.aggiunta_urgente":
    "Added to the request you already had open, flagged as urgent.",
  "assistenza.ok.aggiunta": "Added to the request you already had open: we're looking at it.",
  "assistenza.ok.inviata": "Request sent. We'll answer you in here.",
};

export const tPersone = dizionario(IT, EN);
export type VociPersone = typeof IT;
