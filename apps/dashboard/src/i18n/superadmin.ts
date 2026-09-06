import { dizionario, type Speculare } from "@repo/shared/i18n";

/**
 * Il pannello della piattaforma: quello di chi vende il servizio, non di chi
 * lo usa in sala.
 *
 * Le legge una persona sola, e parla italiano. Tradurle comunque serve a due
 * cose: il giorno che qualcuno rivende la piattaforma fuori dall'Italia le
 * parole ci sono già, e nel frattempo nessuna stringa resta sepolta nel JSX
 * dove non si trova più.
 *
 * Sull'inglese: "venue" per locale, come nel resto del gestionale — un
 * "restaurant" qui sarebbe sbagliato, perché fra i clienti ci sono bar,
 * pasticcerie e chioschi. "Owner" per il titolare, che è anche il nome del
 * ruolo a database. "Module" per i moduli venduti.
 *
 * I valori a database non si toccano: gli stati dell'abbonamento
 * (trialing, active, past_due, canceled, none), le chiavi dei moduli
 * (ordini, prenotazioni), le azioni scritte nel registro degli interventi.
 * Qui si traduce solo l'etichetta che ci sta sopra.
 */

const IT = {
  // Guscio dell'area
  "guscio.titolo": "Piattaforma",
  "guscio.nav.locali": "Locali",
  "guscio.nav.password": "Password",
  "guscio.guasto.titolo": "Pannello non raggiungibile",
  "guscio.guasto.testo":
    "Non riesco a verificare l'accesso: non è la password, è un guasto. Riprova fra poco — rientrare non serve.",

  // Elenco dei locali
  "pagina.titolo": "Locali",
  "pagina.conteggio": "{n} in tutto · {attivi} con almeno un modulo attivo",
  "pagina.spiegazione":
    "Chi paga con carta viene attivato da solo dal webhook di Stripe, con i moduli scritti nei metadata del prezzo. Qui si interviene per gli altri casi: bonifico, prova estesa concordata, condizioni particolari. Ogni modifica resta scritta accanto al locale.",
  "pagina.tutti": "Tutti i locali",

  // Assistenza
  "assistenza.titolo": "Assistenza",
  "assistenza.conteggio": "({n} da gestire)",

  // In scadenza
  "scadenze.titolo": "In scadenza",
  "scadenze.sottotitolo": "(entro 14 giorni, o già scaduti)",
  "scadenze.scaduto.uno": "scaduto da {n} giorno",
  "scadenze.scaduto.molti": "scaduto da {n} giorni",
  "scadenze.fra.uno": "fra {n} giorno",
  "scadenze.fra.molti": "fra {n} giorni",
  "scadenze.automatico": " · rinnovo automatico",
  "scadenze.a_mano": " · da rinnovare a mano",

  // Riga del locale — intestazione
  "locale.nessun_modulo": "nessun modulo attivo",
  "locale.scaduto.uno": " · scaduto da {n} giorno",
  "locale.scaduto.molti": " · scaduto da {n} giorni",
  "locale.residui.uno": " · ancora {n} giorno",
  "locale.residui.molti": " · ancora {n} giorni",
  "locale.carta": " · paga con carta",
  "locale.tavoli.uno": "{n} tavolo",
  "locale.tavoli.molti": "{n} tavoli",
  "locale.piatti.uno": "{n} piatto a menu",
  "locale.piatti.molti": "{n} piatti a menu",
  "locale.gestisci": "Gestisci",
  "locale.stripe":
    "Questo locale ha un abbonamento attivo su Stripe. Se lo modifichi qui, il prossimo evento di Stripe riscriverà quello che hai messo: per un cambio permanente si interviene sull'abbonamento, non qui.",

  // Moduli — le etichette; le chiavi ordini/prenotazioni restano
  "moduli.titolo": "Moduli",
  "modulo.ordini": "Ordini e pagamenti",
  "modulo.prenotazioni": "Prenotazioni",

  // Abbonamento — le etichette degli stati; i valori a database restano
  "stato.active": "Attivo",
  "stato.trialing": "In prova",
  "stato.past_due": "Insoluto",
  "stato.canceled": "Disdetto",
  "stato.none": "Mai attivato",
  "abbonamento.stato": "Stato",
  "abbonamento.giorni": "Giorni",
  "abbonamento.giorni.vuoto": "—",
  "abbonamento.giorni.nota": "Vuoto: la scadenza resta com’è.",
  "abbonamento.perche": "Perché",
  "abbonamento.perche.placeholder": "Bonifico ricevuto, prova concordata…",
  "abbonamento.salva_moduli": "Salva moduli",
  "abbonamento.salva": "Salva abbonamento",

  // Tipo di locale
  "formato.titolo": "Tipo di locale",
  "formato.spiegazione":
    "Non è un'etichetta: crea le categorie del menu, i gruppi di scelte, i promemoria di legge del caso, e — per chi consegna al bancone — fa sì che ogni cliente abbia il proprio conto invece di condividerlo con chi ha inquadrato prima. Non tocca quello che c'è già.",
  "formato.scegli": "Scegli…",
  "formato.aria": "Tipo di locale di {nome}",
  "formato.applica": "Applica",
  "formato.solo_categorie": "Solo le categorie, senza i gruppi di scelte sui piatti",
  "formato.listino":
    "Con un listino di esempio: nomi e allergeni già compilati, così il cliente non li batte a mano il primo giorno. Le voci nascono spente — i prezzi sono indicativi e li rifà lui.",
  "formato.attuale.prima": "Ora è impostato su",
  "formato.attuale.dopo": ". Applicarne un altro aggiunge, non sostituisce.",

  // Scheda cliente
  "scheda.titolo": "Scheda cliente",
  "scheda.sottotitolo":
    "Quello che il database non sa da solo: chi è il referente, come è arrivato, quando risentirlo.",
  "scheda.referente": "Referente",
  "scheda.referente.placeholder": "Luca Rossi",
  "scheda.telefono": "Telefono",
  "scheda.telefono.placeholder": "+39 …",
  "scheda.email": "Email",
  "scheda.provenienza": "Come è arrivato",
  "scheda.provenienza.placeholder": "Passaparola, fiera…",
  "scheda.ricontattare": "Risentirlo il",
  "scheda.abbandono": "Se ha lasciato, perché",
  "scheda.abbandono.placeholder": "Troppo caro, chiuso…",
  "scheda.salva": "Salva scheda",

  // Note sul cliente
  "note.titolo": "Note",
  "note.sottotitolo":
    "Non si cancellano e non si modificano: una cronologia riscrivibile non serve proprio quando serve.",
  "note.placeholder": "Chiamato, vuole provare le prenotazioni a settembre",
  "note.aria": "Nuova nota",

  // Titolare
  "titolare.titolo": "Titolare",
  "titolare.sottotitolo":
    "Crea l'accesso mentre sei al telefono con lui: chiedergli di registrarsi da solo ne fa perdere una parte al primo modulo. La password iniziale la generiamo noi e si vede una volta sola.",
  "titolare.nome": "Nome",
  "titolare.nome.placeholder": "Luca Rossi",
  "titolare.email": "Email",
  "titolare.email.placeholder": "luca@trattoria.it",
  "titolare.crea": "Crea accesso",
  "titolare.password.a": "Password iniziale,",
  "titolare.password.forte": "scrivila adesso",
  "titolare.password.b": "— non ricompare:",
  "titolare.password.nota": "Al primo accesso gli verrà chiesto di cambiarla.",

  // Registro degli interventi
  "interventi.titolo": "Interventi a mano",

  // Richieste di assistenza
  "ticket.urgente": "blocca il servizio",
  "ticket.ore_fa.uno": "{n} ora fa",
  "ticket.ore_fa.molti": "{n} ore fa",
  "ticket.giorni_fa.uno": "{n} giorno fa",
  "ticket.giorni_fa.molti": "{n} giorni fa",
  "ticket.in_corso": " · presa in carico",
  "ticket.apri": "apri",
  "ticket.chiudi": "chiudi",
  "ticket.risposta.placeholder": "Risposta al locale",
  "ticket.risposta.aria": "Risposta",
  "ticket.rispondi": "Rispondi, resta aperta",
  "ticket.rispondi_chiudi": "Rispondi e chiudi",

  // Cambio password del super amministratore
  "password.titolo.primo": "Scegli la tua password",
  "password.titolo": "Cambia password",
  "password.avviso":
    "La password con cui sei entrato è stata comunicata in chiaro per poterti dare il primo accesso: da quel momento non è più un segreto. Cambiala adesso — questo account vede i dati di tutti i locali.",
  "password.nuova": "Nuova password",
  "password.ripeti": "Ripetila",
  "password.regola": "Almeno 12 caratteri, con lettere, numeri e un simbolo.",
  "password.salvataggio": "Salvo…",
  "password.salva": "Salva password",

  // Esiti delle azioni
  "azione.locale_non_trovato": "Locale non trovato",
  "azione.locale": "Locale",
  "azione.stato_non_valido": "Stato non valido",
  "azione.moduli.nessuno": "nessun modulo",
  "azione.giorni_non_validi":
    "Giorni fra 0 e 1095, oppure vuoto per non cambiare la scadenza",
  "azione.abbonamento.invariata": ", scadenza invariata",
  "azione.abbonamento.ancora.uno": ", ancora {n} giorno",
  "azione.abbonamento.ancora.molti": ", ancora {n} giorni",
  "azione.abbonamento.senza_scadenza": ", senza scadenza",
  "azione.password.corta": "Almeno 12 caratteri: questo accesso vede tutti i locali.",
  "azione.password.diverse": "Le due password non coincidono",
  "azione.password.debole": "Mescola lettere, numeri e almeno un simbolo.",
  "azione.password.ok": "Password aggiornata.",
  "azione.scheda.data": "Data non valida",
  "azione.scheda.ok": "Scheda salvata.",
  "azione.nota.vuota": "Scrivi qualcosa",
  "azione.nota.ok": "Nota aggiunta.",
  "azione.ticket.non_trovato": "Richiesta non trovata",
  "azione.ticket.risolto": "Segnata risolta.",
  "azione.ticket.ok": "Risposta salvata.",
  "azione.titolare.email": "Email non valida",
  "azione.titolare.nome": "Serve il nome del referente",
  "azione.titolare.gia_dentro": "Questa persona è già nel locale",
  "azione.titolare.collegato": "{email} è ora titolare di {locale}. Usa la password che ha già.",
  "azione.titolare.creato": "Titolare creato per {locale}.",
  "azione.formato.ok": "formato applicato.",
};

const EN: Speculare<typeof IT> = {
  "guscio.titolo": "Platform",
  "guscio.nav.locali": "Venues",
  "guscio.nav.password": "Password",
  "guscio.guasto.titolo": "Panel unavailable",
  "guscio.guasto.testo":
    "I can't verify your access: it isn't your password, it's a fault. Try again shortly — signing in again won't help.",

  "pagina.titolo": "Venues",
  "pagina.conteggio": "{n} in total · {attivi} with at least one module on",
  "pagina.spiegazione":
    "Card payers are activated on their own by the Stripe webhook, with the modules written in the price metadata. This panel is for the other cases: bank transfer, an extended trial agreed on the phone, special terms. Every change is recorded next to the venue.",
  "pagina.tutti": "All venues",

  "assistenza.titolo": "Support",
  "assistenza.conteggio": "({n} to handle)",

  "scadenze.titolo": "Expiring",
  "scadenze.sottotitolo": "(within 14 days, or already expired)",
  "scadenze.scaduto.uno": "expired {n} day ago",
  "scadenze.scaduto.molti": "expired {n} days ago",
  "scadenze.fra.uno": "in {n} day",
  "scadenze.fra.molti": "in {n} days",
  "scadenze.automatico": " · renews automatically",
  "scadenze.a_mano": " · renew by hand",

  "locale.nessun_modulo": "no module on",
  "locale.scaduto.uno": " · expired {n} day ago",
  "locale.scaduto.molti": " · expired {n} days ago",
  "locale.residui.uno": " · {n} day left",
  "locale.residui.molti": " · {n} days left",
  "locale.carta": " · pays by card",
  "locale.tavoli.uno": "{n} table",
  "locale.tavoli.molti": "{n} tables",
  "locale.piatti.uno": "{n} dish on the menu",
  "locale.piatti.molti": "{n} dishes on the menu",
  "locale.gestisci": "Manage",
  "locale.stripe":
    "This venue has an active Stripe subscription. If you change it here, the next Stripe event will overwrite what you set: for a permanent change, work on the subscription, not here.",

  "moduli.titolo": "Modules",
  "modulo.ordini": "Orders and payments",
  "modulo.prenotazioni": "Bookings",

  "stato.active": "Active",
  "stato.trialing": "On trial",
  "stato.past_due": "Unpaid",
  "stato.canceled": "Cancelled",
  "stato.none": "Never activated",
  "abbonamento.stato": "Status",
  "abbonamento.giorni": "Days",
  "abbonamento.giorni.vuoto": "—",
  "abbonamento.giorni.nota": "Empty: the expiry date stays as it is.",
  "abbonamento.perche": "Why",
  "abbonamento.perche.placeholder": "Transfer received, trial agreed…",
  "abbonamento.salva_moduli": "Save modules",
  "abbonamento.salva": "Save subscription",

  "formato.titolo": "Venue type",
  "formato.spiegazione":
    "Not just a label: it creates the menu categories, the option groups, the legal notices that apply, and — for counter service — makes sure every customer gets their own bill instead of sharing it with whoever scanned before them. It leaves what is already there untouched.",
  "formato.scegli": "Choose…",
  "formato.aria": "Venue type for {nome}",
  "formato.applica": "Apply",
  "formato.solo_categorie": "Categories only, without the option groups on dishes",
  "formato.listino":
    "With a sample price list: names and allergens already filled in, so the customer doesn't type them by hand on day one. The items start switched off — the prices are indicative and they will redo them.",
  "formato.attuale.prima": "It is now set to",
  "formato.attuale.dopo": ". Applying another one adds to it, it doesn't replace it.",

  "scheda.titolo": "Customer record",
  "scheda.sottotitolo":
    "What the database doesn't know by itself: who the contact is, how they got here, when to call them back.",
  "scheda.referente": "Contact",
  "scheda.referente.placeholder": "Luca Rossi",
  "scheda.telefono": "Phone",
  "scheda.telefono.placeholder": "+39 …",
  "scheda.email": "Email",
  "scheda.provenienza": "How they got here",
  "scheda.provenienza.placeholder": "Word of mouth, trade fair…",
  "scheda.ricontattare": "Call back on",
  "scheda.abbandono": "If they left, why",
  "scheda.abbandono.placeholder": "Too expensive, closed down…",
  "scheda.salva": "Save record",

  "note.titolo": "Notes",
  "note.sottotitolo":
    "They can't be deleted or edited: a history you can rewrite is no use exactly when you need it.",
  "note.placeholder": "Called, wants to try bookings in September",
  "note.aria": "New note",

  "titolare.titolo": "Owner",
  "titolare.sottotitolo":
    "Create the login while you are on the phone with them: asking them to register on their own loses a share at the first form. We generate the initial password and it is shown only once.",
  "titolare.nome": "Name",
  "titolare.nome.placeholder": "Luca Rossi",
  "titolare.email": "Email",
  "titolare.email.placeholder": "luca@trattoria.it",
  "titolare.crea": "Create login",
  "titolare.password.a": "Initial password,",
  "titolare.password.forte": "write it down now",
  "titolare.password.b": "— it won't be shown again:",
  "titolare.password.nota": "They will be asked to change it on first sign-in.",

  "interventi.titolo": "Manual changes",

  "ticket.urgente": "service is down",
  "ticket.ore_fa.uno": "{n} hour ago",
  "ticket.ore_fa.molti": "{n} hours ago",
  "ticket.giorni_fa.uno": "{n} day ago",
  "ticket.giorni_fa.molti": "{n} days ago",
  "ticket.in_corso": " · being handled",
  "ticket.apri": "open",
  "ticket.chiudi": "close",
  "ticket.risposta.placeholder": "Answer to the venue",
  "ticket.risposta.aria": "Answer",
  "ticket.rispondi": "Answer, leave open",
  "ticket.rispondi_chiudi": "Answer and close",

  "password.titolo.primo": "Choose your password",
  "password.titolo": "Change password",
  "password.avviso":
    "The password you signed in with was given to you in the clear so you could get in the first time: from that moment on it is no longer a secret. Change it now — this account sees the data of every venue.",
  "password.nuova": "New password",
  "password.ripeti": "Repeat it",
  "password.regola": "At least 12 characters, with letters, numbers and a symbol.",
  "password.salvataggio": "Saving…",
  "password.salva": "Save password",

  "azione.locale_non_trovato": "Venue not found",
  "azione.locale": "Venue",
  "azione.stato_non_valido": "Invalid status",
  "azione.moduli.nessuno": "no module",
  "azione.giorni_non_validi":
    "Days between 0 and 1095, or empty to leave the expiry date alone",
  "azione.abbonamento.invariata": ", expiry date unchanged",
  "azione.abbonamento.ancora.uno": ", {n} day left",
  "azione.abbonamento.ancora.molti": ", {n} days left",
  "azione.abbonamento.senza_scadenza": ", no expiry date",
  "azione.password.corta": "At least 12 characters: this login sees every venue.",
  "azione.password.diverse": "The two passwords don't match",
  "azione.password.debole": "Mix letters, numbers and at least one symbol.",
  "azione.password.ok": "Password updated.",
  "azione.scheda.data": "Invalid date",
  "azione.scheda.ok": "Record saved.",
  "azione.nota.vuota": "Write something",
  "azione.nota.ok": "Note added.",
  "azione.ticket.non_trovato": "Request not found",
  "azione.ticket.risolto": "Marked resolved.",
  "azione.ticket.ok": "Answer saved.",
  "azione.titolare.email": "Invalid email",
  "azione.titolare.nome": "The contact's name is required",
  "azione.titolare.gia_dentro": "This person is already in the venue",
  "azione.titolare.collegato":
    "{email} is now the owner of {locale}. They use the password they already have.",
  "azione.titolare.creato": "Owner created for {locale}.",
  "azione.formato.ok": "format applied.",
};

export const tSuperAdmin = dizionario(IT, EN);
export type VociSuperAdmin = typeof IT;
