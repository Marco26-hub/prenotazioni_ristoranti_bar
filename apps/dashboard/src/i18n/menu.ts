import { dizionario, type LinguaUI, type Speculare } from "@repo/shared/i18n";
import { tComune } from "@repo/shared/i18n/comune";

/**
 * L'interfaccia della pagina Menu del gestionale.
 *
 * Da non confondere con `traduzioni-form.tsx` e `lingue-form.tsx`, che stanno
 * in questa stessa cartella: quelli traducono il *contenuto* — i nomi dei
 * piatti scritti dal ristoratore, in dieci lingue. Qui si traduce il
 * *software* che serve a fare quel lavoro, e le lingue sono due.
 *
 * L'inglese è quello del mestiere: "station" per il reparto, "out of stock"
 * per l'esaurito, "guest" per il cliente al tavolo. I termini fiscali
 * italiani (IVA, Partita IVA) restano in italiano con la spiegazione fra
 * parentesi la prima volta: chi tiene la contabilità deve poterli ritrovare
 * uguali sul portale dell'Agenzia delle Entrate.
 */

const IT = {
  // Pagina
  "pagina.titolo": "Menu",
  "pagina.nessun.locale": "Nessun locale associato.",
  "pagina.formato.in.uso": "Formato in uso:",
  "pagina.formato.cambia": "cambia",
  "pagina.riepilogo": "{piatti} piatti in {categorie} categorie",
  "pagina.senza.categoria": "Senza categoria",
  "pagina.nessuna.categoria": "nessuna categoria",

  // Avvisi in testa alla pagina
  "avviso.senza.allergeni": "{n} senza allergeni — obbligatori per legge",
  "avviso.senza.foto": "{n} senza foto",
  "avviso.nascosti": "{n} nascosti al cliente",
  "avviso.da.tradurre": "{n} da tradurre in {lingua}",

  // Scheda del piatto nell'elenco
  "piatto.iva": "IVA {aliquota}%",
  "piatto.nascosto": "Nascosto",
  "piatto.solfiti.mancanti": "Solfiti non dichiarati",
  "piatto.allergeni": "Allergeni: {elenco}",
  "piatto.allergeni.mancanti": "Allergeni non indicati",
  "piatto.abbinamento": "Con {nome}",
  "piatto.prezzo": "Prezzo",
  "piatto.prezzo.di": "Prezzo di {nome}",
  "piatto.prezzo.salva": "Salva prezzo di {nome}",
  "piatto.sposta.su": "Sposta {nome} su",
  "piatto.sposta.giu": "Sposta {nome} giù",
  "piatto.nascondi": "Nascondi",
  "piatto.riattiva": "Riattiva",
  "piatto.duplica": "Duplica",
  "piatto.duplica.di": "Duplica {nome}",

  // Categorie
  "categoria.rinomina": "Rinomina",
  "categoria.nome": "Nome della categoria {nome}",
  "categoria.sposta.su": "Sposta {nome} su",
  "categoria.sposta.giu": "Sposta {nome} giù",
  "categoria.elimina": "Elimina categoria",
  "categoria.nuova.titolo": "Nuova categoria",
  "categoria.nuova.segnaposto": "Antipasti, Primi, Dolci…",
  "categoria.nuova.aggiungi": "Aggiungi categoria",

  // Sezioni in fondo
  "sezione.formato.titolo": "Che locale sei",
  "sezione.formato.testo":
    "Imposta categorie e scelte tipiche del tuo formato, e ti ricorda quello che in quel formato si dimentica.",
  "sezione.lingue.titolo": "Lingue del menu",
  "sezione.importa.titolo": "Importa un menu esistente",
  "sezione.importa.cassa": "Dalla cassa",
  "sezione.importa.file": "Da file CSV o TSV",

  // Aggiunta rapida
  "nuovo.apri": "+ Nuovo piatto o bevanda in {categoria}",
  "nuovo.titolo": "Nuova voce",
  "nuovo.categoria": "Categoria: {categoria}",
  "nuovo.nome": "Nome",
  "nuovo.nome.segnaposto": "Es. Acqua naturale 0,75 L",
  "nuovo.prezzo": "Prezzo (€)",
  "nuovo.prezzo.segnaposto": "0,00",
  "nuovo.crea": "Crea voce",
  "nuovo.nota":
    "Dopo la creazione usa “Modifica” per foto, descrizione, allergeni e varianti.",

  // Modifica di un piatto
  "modifica.copia.avviso":
    "Questa è una copia indipendente: nome, descrizione, ingredienti, prezzo, foto, allergeni, varianti e categoria si cambiano tutti da qui. Modificarla non tocca il piatto di partenza.",
  "modifica.nome": "Nome",
  "modifica.prezzo": "Prezzo (€)",
  "modifica.iva": "IVA (%)",
  "modifica.fuori.formula": "Fuori formula",
  "modifica.fuori.formula.nota":
    "— si paga a parte anche al tavolo a prezzo fisso (dolci, caffè, amari, bevande, piatti premium)",
  "modifica.tipo": "Tipo di voce",
  "modifica.tipo.nota":
    "Calice, bottiglia e magnum non si impostano qui: sono varianti, così ognuna ha il suo prezzo e può esaurirsi da sola.",
  "modifica.produttore": "Produttore",
  "modifica.birrificio": "Birrificio",
  "modifica.zona": "Zona o paese",
  "modifica.denominazione": "Denominazione",
  "modifica.denominazione.segnaposto": "DOCG",
  "modifica.annata": "Annata",
  "modifica.gradazione": "Gradazione",
  "modifica.sottocategoria": "Sottocategoria",
  "modifica.sottocategoria.vino": "Bianco, rosso, bollicine",
  "modifica.sottocategoria.birra": "Bionda, rossa, scura, artigianale",
  "modifica.sottocategoria.bevanda": "Naturale, frizzante, cola",
  "modifica.formato": "Formato",
  "modifica.formato.segnaposto": "0,33 L · 0,75 L · calice",
  "modifica.servizio": "Servizio",
  "modifica.servizio.segnaposto": "Bottiglia · spina · calice",
  "modifica.stile.birra": "Stile birra",
  "modifica.stile.birra.segnaposto": "Lager · IPA · Porter · Weiss",
  "modifica.vitigno": "Vitigno o uvaggio",
  "modifica.vitigno.segnaposto": "Vermentino · Sangiovese · blend",
  "modifica.nota.servizio": "Nota di servizio",
  "modifica.nota.servizio.segnaposto": "Servire a 10-12 °C · Decantare 30 minuti",
  "modifica.solfiti.prima":
    "Quasi ogni vino supera i 10 mg/l di solfiti e va dichiarato: scrivi ",
  "modifica.solfiti.parola": "solfiti",
  "modifica.solfiti.dopo": " fra gli allergeni qui sotto.",
  "modifica.categoria": "Categoria",
  "modifica.categoria.nessuna": "Nessuna categoria",
  "modifica.descrizione": "Descrizione",
  "modifica.ingredienti": "Ingredienti",
  "modifica.diciture":
    "Diciture — vegetariano, vegano, senza_glutine, senza_lattosio, piccante",
  "modifica.diciture.segnaposto": "vegetariano, piccante",
  "modifica.abbinamento": "Si abbina bene con",
  "modifica.abbinamento.nessuno": "Nessun abbinamento",
  "modifica.conservazione": "Conservazione",
  "modifica.conservazione.nota":
    "Diverso da fresco: al cliente compare l'asterisco con la nota di legge. Ometterlo è frode in commercio.",
  "modifica.origine": "Origine (obbligatoria per la carne bovina)",
  "modifica.origine.segnaposto": "Nato, allevato e macellato in Italia",
  "modifica.disponibile":
    "Disponibile — se tolto, il piatto sparisce dal menu del cliente",
  "modifica.salvataggio": "Salvataggio…",
  "modifica.salva": "Salva modifiche",
  "modifica.salvato": "Salvato",

  // Tipo di voce: le etichette di `TIPO_ETICHETTA` in bevande.ts
  "tipo.food": "Piatto",
  "tipo.wine": "Vino",
  "tipo.beer": "Birra",
  "tipo.drink": "Altra bevanda",

  // Caselle degli allergeni. I nomi stanno in comune.ts perché sono di
  // legge; qui restano solo gli esempi, che servono a farli riconoscere.
  "allergeni.legenda": "Allergeni — obbligatori per legge (Reg. UE 1169/2011)",
  "allergeni.fuori.elenco.prima":
    "Voci non previste dall'Allegato II già salvate su questo piatto:",
  "allergeni.fuori.elenco.dopo":
    ". Restano sul menu, ma non valgono come dichiarazione: spunta sopra l'allergene corrispondente.",
  "allergeni.nessuno.spuntato":
    "Nessuno spuntato. Se il piatto ne contiene davvero nessuno, va bene; se non li hai ancora verificati, il menu non è a norma.",
  "allergene.esempi.glutine": "grano, segale, orzo, farro, kamut",
  "allergene.esempi.crostacei": "gambero, scampo, granchio",
  "allergene.esempi.uova": "anche in paste e maionese",
  "allergene.esempi.pesce": "anche colle e brodi di pesce",
  "allergene.esempi.arachidi": "distinte dalla frutta a guscio",
  "allergene.esempi.soia": "salsa di soia, lecitina",
  "allergene.esempi.latte": "compreso il lattosio, burro, formaggi",
  "allergene.esempi.frutta a guscio": "mandorle, nocciole, noci, pistacchi",
  "allergene.esempi.sedano": "anche nei fondi e nei brodi",
  "allergene.esempi.senape": "anche in salse e marinature",
  "allergene.esempi.sesamo": "pane, hummus, tahina",
  "allergene.esempi.solfiti": "vino, aceto, frutta secca — oltre 10 mg/kg",
  "allergene.esempi.lupini": "farine senza glutine, hamburger veg",
  "allergene.esempi.molluschi": "cozze, vongole, calamaro, polpo",

  // Postazioni
  "postazione.titolo": "Postazioni",
  "postazione.testo":
    "Dove si prepara ogni categoria. Decidono su quale schermo compare la comanda e chi la può muovere: il barista vede il bar, il cuoco la cucina.",
  "postazione.nome": "Nome della postazione {nome}",
  "postazione.categorie.uno": "{n} categoria",
  "postazione.categorie.molti": "{n} categorie",
  "postazione.togli": "Togli",
  "postazione.nuova.segnaposto": "Forno, Friggitoria, Cucina 2, Pass…",
  "postazione.nuova": "Nuova postazione",
  "postazione.nota":
    "Rinominare non toglie il permesso a nessuno: quello che conta resta legato alla postazione, non al nome che le hai dato.",
  "postazione.dove.si.prepara": "Dove si prepara {categoria}",
  "postazione.errore.nome.corto": "Serve un nome di almeno due lettere",
  "postazione.errore.nome.inutilizzabile": "Nome non utilizzabile: usa lettere e numeri",
  "postazione.aggiunta": "\"{nome}\" aggiunta.",
  "postazione.errore.esiste": "Esiste già una postazione con questo nome",
  "postazione.errore.non.trovata": "Postazione non trovata",
  "postazione.rinominata": "Rinominata.",
  "postazione.errore.in.uso":
    "Ci sono ancora {n} categorie su questa postazione: spostale prima, o le loro comande non le vedrebbe più nessuno.",
  "postazione.tolta": "Tolta.",
  "postazione.categoria.non.trovata": "Categoria non trovata",
  "postazione.categoria.spostata": "Spostata.",

  // Varianti e aggiunte
  "varianti.apri.con": "Scelte di questo piatto ({n})",
  "varianti.apri.senza": "Aggiungi scelte a questo piatto",
  "varianti.titolo": "Scelte di questo piatto",
  "varianti.testo.prima": "Quello che il cliente sceglie quando ordina ",
  "varianti.testo.enfasi": "questo",
  "varianti.testo.dopo":
    " piatto. Per aggiungere un'altra portata usa il bottone in fondo alla categoria.",
  "varianti.obbligatorio": "obbligatorio",
  "varianti.facoltativo": "facoltativo",
  "varianti.multiple": " · scelte multiple",
  "varianti.elimina.gruppo": "Elimina gruppo",
  "varianti.senza": "Senza {nome}",
  "varianti.esaurito": "Esaurito",
  "varianti.ripristina": "Ripristina",
  "varianti.vuoto": "Nessuna scelta: finché è vuoto, il gruppo non compare al cliente.",
  "varianti.opzione.segnaposto": "12 pezzi, Avocado, Al sangue…",
  "varianti.supplemento": "Supplemento in euro",
  "varianti.aggiungi.scelta": "Aggiungi scelta",
  "varianti.nuovo.gruppo": "Nuovo gruppo di scelte",
  "varianti.nuovo.gruppo.testo.prima":
    "Non serve ad aggiungere piatti — quello si fa in fondo alla categoria. Qui aggiungi le scelte che il cliente fa ",
  "varianti.nuovo.gruppo.testo.enfasi": "su questo piatto",
  "varianti.nuovo.gruppo.testo.dopo":
    ": la cottura, la porzione, gli ingredienti extra.",
  "varianti.gruppo.nome": "Come si chiama il gruppo",
  "varianti.gruppo.nome.segnaposto": "Cottura · Porzione · Aggiungi · Togli",
  "varianti.gruppo.tipo": "Che tipo di scelta",
  "varianti.gruppo.tipo.scelta": "Scelta — una fra più opzioni, es. la cottura",
  "varianti.gruppo.tipo.aggiunta": "Aggiunta — extra a pagamento, es. bacon +1,50",
  "varianti.gruppo.tipo.rimozione": "Rimozione — cosa togliere, es. senza cipolla",
  "varianti.gruppo.obbligatorio": "Il cliente deve scegliere",
  "varianti.gruppo.multiplo": "Può sceglierne più di una",
  "varianti.gruppo.crea": "Crea gruppo",
  "varianti.errore.nome.gruppo": "Serve un nome per il gruppo",
  "varianti.errore.piatto": "Piatto non trovato",
  "varianti.gruppo.creato": "Gruppo creato: ora aggiungi le scelte.",
  "varianti.gruppo.eliminato": "Gruppo eliminato",
  "varianti.errore.nome.scelta": "Serve un nome per la scelta",
  "varianti.errore.supplemento": "Supplemento non valido",
  "varianti.errore.gruppo": "Gruppo non trovato",
  "varianti.scelta.aggiunta": "Scelta aggiunta",
  "varianti.scelta.eliminata": "Scelta eliminata",

  // Traduzioni del contenuto del menu
  "traduzioni.lingue": "Lingue",
  "traduzioni.nome": "Nome — in italiano: {italiano}",
  "traduzioni.descrizione": "Descrizione — in italiano: {italiano}",
  "traduzioni.ingredienti": "Ingredienti",
  "traduzioni.nota":
    "I campi lasciati vuoti restano in italiano: meglio del nulla, per chi legge.",
  "traduzioni.salvo": "Salvo…",
  "traduzioni.salva": "Salva traduzione",
  "traduzioni.errore.richiesta": "Richiesta non valida",
  "traduzioni.errore.piatto": "Piatto non trovato",
  "traduzioni.salvato": "Salvato",

  // Lingue in cui il locale offre il menu
  "lingue.testo":
    "L'italiano c'è sempre. Scegli le altre lingue in cui vuoi offrire il menu: al cliente compare un selettore, e chi arriva con il telefono in inglese lo trova già in inglese.",
  "lingue.salvo": "Salvo…",
  "lingue.salva": "Salva lingue",
  "lingue.nessuna": "Menu solo in italiano: al cliente non compare nessun selettore.",
  "lingue.attivate": "Attivate {n} lingue. Traduci i piatti da qui sotto.",

  // Formato del locale
  // ---- Esito dell'applicazione di un formato --------------------------
  // Torna da `lib/formato.ts`, che la usano in due: il ristoratore dal
  // proprio menu e chi vende dal pannello di piattaforma.
  "applica.errore.tipo": "Formato non riconosciuto",
  // Il nome che prende un piatto appena duplicato: il ristoratore lo
  // riscrive subito, ma nel frattempo deve leggerlo nella sua lingua.
  "azione.copia_di": "Copia di {nome}",
  "applica.solo_categorie.uno": "{n} categoria aggiunta. I piatti li carichi tu.",
  "applica.solo_categorie.molti": "{n} categorie aggiunte. I piatti li carichi tu.",
  "applica.solo_categorie.nessuna": "Le categorie c'erano già. Formato impostato.",
  "applica.nulla": "Formato impostato. Non c'era nulla da aggiungere: categorie e scelte esistono già.",
  "applica.fatto":
    "Formato impostato. {categorie} aggiunte, {gruppi} creati sui piatti esistenti. Prezzi e opzioni li ritocchi voce per voce.",
  "applica.fatto.categorie.uno": "{n} categoria",
  "applica.fatto.categorie.molti": "{n} categorie",
  "applica.fatto.gruppi.uno": "{n} gruppo di scelte",
  "applica.fatto.gruppi.molti": "{n} gruppi di scelte",
  "applica.nota.banco":
    " Consegna al bancone accesa: ogni cliente ha il suo conto e il suo numero, e la pagina principale diventa il Banco.",
  "applica.nota.iva.uno": " {n} voce portata all'aliquota della sua categoria: controllala.",
  "applica.nota.iva.molti": " {n} voci portate all'aliquota della loro categoria: controllale.",
  "applica.nota.listino.uno":
    " {n} voce di esempio creata, spenta: prezzo e allergeni vanno controllati prima di accenderla — nessun cliente la vede finché non lo fai.",
  "applica.nota.listino.molti":
    " {n} voci di esempio create, tutte spente: prezzi e allergeni vanno controllati prima di accenderle — nessun cliente le vede finché non lo fai.",
  // Le categorie che restano a pagamento sono vuote al primo giorno: quello
  // che si carica dopo nasce dentro il prezzo fisso, e nessuno lo dice.
  "applica.nota.riapplica":
    " Le categorie che restano a pagamento anche dentro la formula ({elenco}) sono ancora vuote: quando le hai caricate, riapplica il formato. Le voci aggiunte dopo nascono dentro il prezzo fisso, e con la formula attiva il conto non le addebita.",

  "formato.categorie": "Categorie",
  "formato.scelte": "Scelte proposte",
  "formato.gruppo.rimozione": "— cosa togliere",
  "formato.gruppo.aggiunta": "— aggiunte a pagamento",
  "formato.gruppo.obbligatorio": "— obbligatorio",
  "formato.gruppo.facoltativo": "— facoltativo",
  "formato.promemoria.titolo": "Da tenere a mente per questo formato",
  "formato.solo.categorie": "Solo le categorie, senza le scelte",
  "formato.solo.categorie.nota":
    "Utile se le varianti le vuoi impostare tu piatto per piatto.",
  "formato.listino": "Parti da un listino di esempio ({n} voci)",
  "formato.listino.nota.prima":
    "Nomi e allergeni già compilati, così non li batti a mano il primo giorno — gli allergeni sono l'obbligo che costa da 3.000 a 24.000 euro. I prezzi sono indicativi e vanno rifatti: le voci nascono ",
  "formato.listino.nota.spente": "spente",
  "formato.listino.nota.dopo":
    " e nessun cliente le vede finché non le accendi tu, una per una.",
  "formato.nota":
    "Non tocca nulla di quello che hai già: le categorie esistenti restano, e un gruppo di scelte con lo stesso nome non viene sovrascritto. Le scelte si applicano ai piatti già caricati nelle categorie previste.",
  "formato.applico": "Applico…",
  "formato.applica": "Applica il modello {nome}",

  // Nome e descrizione dei formati di `MODELLI` in formati.ts
  "formato.ristorante.nome": "Ristorante",
  "formato.ristorante.descrizione": "Con carta dei vini, portate e menu degustazione.",
  "formato.pizzeria.nome": "Pizzeria",
  "formato.pizzeria.descrizione":
    "Impasti, formati e ingredienti da aggiungere o togliere.",
  "formato.pizza_al_trancio.nome": "Pizza al trancio",
  "formato.pizza_al_trancio.descrizione":
    "Vendita a trancio o a peso, da asporto e sul posto.",
  "formato.piadineria.nome": "Piadineria",
  "formato.piadineria.descrizione": "Impasti, farciture componibili e aggiunte.",
  "formato.sushi.nome": "Sushi / All you can eat",
  "formato.sushi.descrizione": "Ordinazioni a ondate, con intervallo fra una e l'altra.",
  "formato.steak_house.nome": "Grill e steak house",
  "formato.steak_house.descrizione": "Tagli, cotture, frollature e contorni a scelta.",
  "formato.paninoteca.nome": "Paninoteca",
  "formato.paninoteca.descrizione": "Pane, farciture e menu combinati.",
  "formato.hamburgeria.nome": "Hamburgeria",
  "formato.hamburgeria.descrizione": "Carne, pane, cotture, aggiunte e doppie.",
  "formato.gintoneria.nome": "Gintoneria e cocktail bar",
  "formato.gintoneria.descrizione": "Distillati, toniche e botaniche da comporre.",
  "formato.birreria.nome": "Birreria e pub",
  "formato.birreria.descrizione": "Spina e bottiglia, formati e stili.",
  "formato.tisaneria.nome": "Tisaneria e sala da tè",
  "formato.tisaneria.descrizione": "Infusi, formati e accompagnamenti.",
  "formato.bar.nome": "Bar e caffetteria",
  "formato.bar.descrizione": "Caffetteria, colazione, aperitivo.",

  // Foto del piatto
  "foto.cambia": "Cambia foto",
  "foto.aggiungi": "Aggiungi foto",
  "foto.caricamento": "Caricamento…",
  "foto.limiti": "JPG, PNG o WEBP fino a 300 KB",
  "foto.errore.piatto": "Piatto non indicato",
  "foto.errore.nessuna": "Nessuna immagine selezionata",
  "foto.errore.formato": "Formato non supportato: usa JPG, PNG o WEBP",
  "foto.errore.peso": "Immagine troppo pesante (massimo 300 KB)",
  "foto.errore.non.trovato": "Piatto non trovato",

  // Importazione da file
  "importa.testo.prima": "Carica un file ",
  "importa.testo.excel": "Excel (.xlsx)",
  "importa.testo.dopo":
    ", CSV o TSV. Sono supportati piatti e bevande con categoria, tipo, formato, produttore, stile, vitigno, servizio, foto, allergeni, postazione, fuori formula e dati fiscali. Le colonne aggiuntive sono facoltative e le categorie mancanti vengono create da sole, sulla postazione indicata nel file.",
  "importa.esempio": "Scarica un file di esempio",
  "importa.in.corso": "Importazione...",
  "importa.avvia": "Importa menu",
  "importa.fatti": "{n} piatti importati.",
  "importa.saltate": "Righe saltate:",
  "importa.errore.nessun.file": "Nessun file selezionato",
  "importa.errore.troppo.grande": "File troppo grande (massimo 1 MB)",
  "importa.errore.illeggibile":
    "File non leggibile: controlla che sia un CSV, TSV o Excel valido",
  "importa.errore.vuoto": "Il file è vuoto",
  "importa.errore.troppe.righe": "Troppe righe (massimo {max})",
  "importa.saltata.nome": "riga {riga}: manca il nome del piatto",
  "importa.saltata.prezzo": "riga {riga} ({nome}): prezzo non valido",
  "importa.saltata.iva": "riga {riga} ({nome}): IVA non valida",
  "importa.iva.assunta.uno":
    "{n} riga senza IVA nel file: importate al 10%, l'aliquota della somministrazione. Se ci sono vini o alcolici correggili a 22% prima di emettere fatture.",
  "importa.iva.assunta.molti":
    "{n} righe senza IVA nel file: importate al 10%, l'aliquota della somministrazione. Se ci sono vini o alcolici correggili a 22% prima di emettere fatture.",
  // La postazione decide su quale schermo esce la comanda e chi la può
  // muovere: una categoria nata dall'import senza reparto va in cucina, e
  // chi ha il banco del crudo separato deve accorgersene subito.
  "importa.categorie.nuove.uno":
    "{n} categoria nuova creata dall'import: {elenco}. Se la postazione non è quella giusta, cambiala qui sotto sulla categoria.",
  "importa.categorie.nuove.molti":
    "{n} categorie nuove create dall'import: {elenco}. Se la postazione non è quella giusta, cambiala qui sotto sulla categoria.",

  // Importazione dalla cassa
  "tilby.non.collegato.prima": "Collega il tuo gestionale di cassa in ",
  "tilby.impostazioni": "Impostazioni",
  "tilby.non.collegato.dopo":
    " per importare il menu che hai già, con prezzi e IVA corretti.",
  "tilby.testo":
    "Riallinea il menu a quello in cassa: aggiorna prezzi e disponibilità dei piatti già presenti e aggiunge i nuovi. Non cancella nulla.",
  "tilby.in.corso": "Importazione da Tilby...",
  "tilby.avvia": "Importa da Tilby",
  "tilby.fatto": "{creati} piatti aggiunti, {aggiornati} aggiornati.",
  "tilby.errore.non.collegato": "Tilby non è collegato: impostalo prima in Impostazioni",
  "tilby.errore.lettura": "Errore lettura da Tilby",
  "tilby.saltato.senza.nome": "articolo Tilby {id}: senza nome",
  "tilby.saltato.prezzo": "{nome}: prezzo non valido in cassa",
  "tilby.iva.mancante.uno":
    "{n} voce: la cassa non ha dichiarato l'IVA. Su quelle già presenti è rimasta l'aliquota che avevi impostato, sulle nuove vale il 10% — controllale se vendi anche alcolici.",
  "tilby.iva.mancante.molti":
    "{n} voci: la cassa non ha dichiarato l'IVA. Su quelle già presenti è rimasta l'aliquota che avevi impostato, sulle nuove vale il 10% — controllale se vendi anche alcolici.",

  // Scheda vino letta dall'etichetta
  "etichetta.non.attiva.prima":
    "Vuoi compilare la scheda fotografando l'etichetta? Collega una chiave OpenRouter in ",
  "etichetta.impostazioni": "Impostazioni",
  "etichetta.non.attiva.dopo": ".",
  "etichetta.leggo": "Leggo l'etichetta…",
  "etichetta.compila": "Compila da foto dell'etichetta",
  "etichetta.limiti": "Etichetta o scheda tecnica, fino a 800 KB",
  "etichetta.proposta": "Proposta — rileggila prima di salvare",
  "etichetta.allergeni": "Allergeni: ",
  "etichetta.copia": "Copia nei campi qui sotto",
  "etichetta.campo.name": "Nome",
  "etichetta.campo.producer": "Produttore",
  "etichetta.campo.vintage": "Annata",
  "etichetta.campo.denomination": "Denominazione",
  "etichetta.campo.origin": "Zona",
  "etichetta.campo.abv": "Gradazione",
  "etichetta.campo.ingredients": "Vitigni",
  "etichetta.campo.description": "Descrizione",
  "etichetta.errore.nessuna.foto": "Nessuna foto selezionata",
  "etichetta.errore.formato": "Formato non supportato: usa JPG, PNG o WEBP",
  "etichetta.errore.peso": "Foto troppo pesante (massimo 800 KB)",
  "etichetta.errore.non.attiva":
    "Lettura da foto non attiva: collega una chiave OpenRouter in Impostazioni.",
  "etichetta.errore.chiave":
    "Chiave OpenRouter illeggibile: reinseriscila in Impostazioni.",
  "etichetta.errore.niente":
    "Non ho letto nulla di utile dalla foto. Prova con più luce, o compila a mano.",
  "etichetta.avviso.incerti": "Controlla a mano: {campi}.",
  "etichetta.avviso.rileggi":
    "Rileggi i campi prima di salvare: quello che scrivi qui lo legge il cliente.",

  // Chiave OpenRouter
  "chiave.rimossa": "Rimossa. La lettura da foto non è più disponibile.",
  "chiave.errore.incolla": "Incolla la chiave OpenRouter",
  "chiave.modello.aggiornato": "Modello aggiornato: {modello}. Chiave invariata.",
  "chiave.errore.prefisso": "La chiave OpenRouter inizia per sk-or-",
  "chiave.collegata":
    "Collegata. Le chiamate vengono addebitate sul tuo account OpenRouter, modello {modello}.",

  // Messaggi delle Server Action sui piatti
  "errore.piatto.non.indicato": "Piatto non indicato",
  "errore.nome.obbligatorio": "Il nome è obbligatorio",
  "errore.prezzo": "Prezzo non valido",
  "errore.categoria": "Categoria non valida",
  "errore.abbinamento.se.stesso": "Un piatto non può abbinarsi a se stesso",
  "errore.abbinamento": "Abbinamento non valido",
  "errore.piatto.non.trovato": "Piatto non trovato",
  "errore.nome.categoria": "Nome categoria mancante",
  "errore.categoria.non.trovata": "Categoria non trovata",
};

const EN: Speculare<typeof IT> = {
  "pagina.titolo": "Menu",
  "pagina.nessun.locale": "No venue linked to this account.",
  "pagina.formato.in.uso": "Venue format in use:",
  "pagina.formato.cambia": "change",
  "pagina.riepilogo": "{piatti} items in {categorie} categories",
  "pagina.senza.categoria": "No category",
  "pagina.nessuna.categoria": "no category",

  "avviso.senza.allergeni": "{n} with no allergens — required by law",
  "avviso.senza.foto": "{n} with no photo",
  "avviso.nascosti": "{n} hidden from guests",
  "avviso.da.tradurre": "{n} to translate into {lingua}",

  "piatto.iva": "VAT (IVA) {aliquota}%",
  "piatto.nascosto": "Hidden",
  "piatto.solfiti.mancanti": "Sulphites not declared",
  "piatto.allergeni": "Allergens: {elenco}",
  "piatto.allergeni.mancanti": "Allergens not listed",
  "piatto.abbinamento": "Goes with {nome}",
  "piatto.prezzo": "Price",
  "piatto.prezzo.di": "Price of {nome}",
  "piatto.prezzo.salva": "Save the price of {nome}",
  "piatto.sposta.su": "Move {nome} up",
  "piatto.sposta.giu": "Move {nome} down",
  "piatto.nascondi": "Hide",
  "piatto.riattiva": "Show again",
  "piatto.duplica": "Duplicate",
  "piatto.duplica.di": "Duplicate {nome}",

  "categoria.rinomina": "Rename",
  "categoria.nome": "Name of the {nome} category",
  "categoria.sposta.su": "Move {nome} up",
  "categoria.sposta.giu": "Move {nome} down",
  "categoria.elimina": "Delete category",
  "categoria.nuova.titolo": "New category",
  "categoria.nuova.segnaposto": "Starters, First courses, Desserts…",
  "categoria.nuova.aggiungi": "Add category",

  "sezione.formato.titolo": "What kind of venue you are",
  "sezione.formato.testo":
    "Sets up the categories and choices typical of your format, and reminds you of what gets forgotten in that format.",
  "sezione.lingue.titolo": "Menu languages",
  "sezione.importa.titolo": "Import an existing menu",
  "sezione.importa.cassa": "From the till",
  "sezione.importa.file": "From a CSV or TSV file",

  "nuovo.apri": "+ New dish or drink in {categoria}",
  "nuovo.titolo": "New item",
  "nuovo.categoria": "Category: {categoria}",
  "nuovo.nome": "Name",
  "nuovo.nome.segnaposto": "E.g. Still water 0.75 L",
  "nuovo.prezzo": "Price (€)",
  "nuovo.prezzo.segnaposto": "0.00",
  "nuovo.crea": "Create item",
  "nuovo.nota":
    "Once it exists, use “Edit” for the photo, description, allergens and options.",

  "modifica.copia.avviso":
    "This is a standalone copy: name, description, ingredients, price, photo, allergens, options and category are all changed from here. Editing it does not touch the dish it came from.",
  "modifica.nome": "Name",
  "modifica.prezzo": "Price (€)",
  "modifica.iva": "VAT rate — IVA (%)",
  "modifica.fuori.formula": "Outside the fixed-price deal",
  "modifica.fuori.formula.nota":
    "— charged separately even at a fixed-price table (desserts, coffee, digestifs, drinks, premium dishes)",
  "modifica.tipo": "Item type",
  "modifica.tipo.nota":
    "Glass, bottle and magnum are not set here: they are options, so each carries its own price and can run out on its own.",
  "modifica.produttore": "Producer",
  "modifica.birrificio": "Brewery",
  "modifica.zona": "Region or country",
  "modifica.denominazione": "Denomination",
  "modifica.denominazione.segnaposto": "DOCG",
  "modifica.annata": "Vintage",
  "modifica.gradazione": "ABV",
  "modifica.sottocategoria": "Subcategory",
  "modifica.sottocategoria.vino": "White, red, sparkling",
  "modifica.sottocategoria.birra": "Pale, amber, dark, craft",
  "modifica.sottocategoria.bevanda": "Still, sparkling, cola",
  "modifica.formato": "Size",
  "modifica.formato.segnaposto": "0.33 L · 0.75 L · glass",
  "modifica.servizio": "Service",
  "modifica.servizio.segnaposto": "Bottle · draught · glass",
  "modifica.stile.birra": "Beer style",
  "modifica.stile.birra.segnaposto": "Lager · IPA · Porter · Weiss",
  "modifica.vitigno": "Grape or blend",
  "modifica.vitigno.segnaposto": "Vermentino · Sangiovese · blend",
  "modifica.nota.servizio": "Serving note",
  "modifica.nota.servizio.segnaposto": "Serve at 10-12 °C · Decant for 30 minutes",
  "modifica.solfiti.prima":
    "Almost every wine goes over 10 mg/l of sulphites and has to be declared: write ",
  "modifica.solfiti.parola": "solfiti",
  "modifica.solfiti.dopo": " among the allergens below.",
  "modifica.categoria": "Category",
  "modifica.categoria.nessuna": "No category",
  "modifica.descrizione": "Description",
  "modifica.ingredienti": "Ingredients",
  "modifica.diciture":
    "Labels — vegetariano (vegetarian), vegano (vegan), senza_glutine (gluten free), senza_lattosio (lactose free), piccante (spicy)",
  "modifica.diciture.segnaposto": "vegetariano, piccante",
  "modifica.abbinamento": "Goes well with",
  "modifica.abbinamento.nessuno": "No pairing",
  "modifica.conservazione": "Storage",
  "modifica.conservazione.nota":
    "Anything other than fresh puts an asterisk in front of the guest, with the note the law requires. Leaving it out is commercial fraud.",
  "modifica.origine": "Origin (mandatory for beef)",
  "modifica.origine.segnaposto": "Born, reared and slaughtered in Italy",
  "modifica.disponibile":
    "Available — if unticked, the dish disappears from the guest menu",
  "modifica.salvataggio": "Saving…",
  "modifica.salva": "Save changes",
  "modifica.salvato": "Saved",

  "tipo.food": "Dish",
  "tipo.wine": "Wine",
  "tipo.beer": "Beer",
  "tipo.drink": "Other drink",

  "allergeni.legenda": "Allergens — required by law (EU Reg. 1169/2011)",
  "allergeni.fuori.elenco.prima":
    "Entries not covered by Annex II already saved on this dish:",
  "allergeni.fuori.elenco.dopo":
    ". They stay on the menu, but they do not count as a declaration: tick the matching allergen above.",
  "allergeni.nessuno.spuntato":
    "None ticked. If the dish really contains none, that is fine; if you have not checked them yet, the menu is not compliant.",
  "allergene.esempi.glutine": "wheat, rye, barley, spelt, kamut",
  "allergene.esempi.crostacei": "prawn, langoustine, crab",
  "allergene.esempi.uova": "including in pasta and mayonnaise",
  "allergene.esempi.pesce": "including fish glazes and stocks",
  "allergene.esempi.arachidi": "separate from nuts",
  "allergene.esempi.soia": "soy sauce, lecithin",
  "allergene.esempi.latte": "including lactose, butter, cheese",
  "allergene.esempi.frutta a guscio": "almonds, hazelnuts, walnuts, pistachios",
  "allergene.esempi.sedano": "including in bases and stocks",
  "allergene.esempi.senape": "including in sauces and marinades",
  "allergene.esempi.sesamo": "bread, hummus, tahini",
  "allergene.esempi.solfiti": "wine, vinegar, dried fruit — over 10 mg/kg",
  "allergene.esempi.lupini": "gluten-free flours, veggie burgers",
  "allergene.esempi.molluschi": "mussels, clams, squid, octopus",

  "postazione.titolo": "Stations",
  "postazione.testo":
    "Where each category is prepared. Stations decide which screen the ticket lands on and who can move it: the bartender sees the bar, the chef sees the kitchen.",
  "postazione.nome": "Name of the {nome} station",
  "postazione.categorie.uno": "{n} category",
  "postazione.categorie.molti": "{n} categories",
  "postazione.togli": "Remove",
  "postazione.nuova.segnaposto": "Oven, Fryer, Kitchen 2, Pass…",
  "postazione.nuova": "New station",
  "postazione.nota":
    "Renaming takes nobody's access away: what counts stays tied to the station, not to the name you gave it.",
  "postazione.dove.si.prepara": "Where {categoria} is prepared",
  "postazione.errore.nome.corto": "The name needs at least two letters",
  "postazione.errore.nome.inutilizzabile":
    "That name cannot be used: use letters and numbers",
  "postazione.aggiunta": "\"{nome}\" added.",
  "postazione.errore.esiste": "A station with this name already exists",
  "postazione.errore.non.trovata": "Station not found",
  "postazione.rinominata": "Renamed.",
  "postazione.errore.in.uso":
    "There are still {n} categories on this station: move them first, or nobody will see their tickets any more.",
  "postazione.tolta": "Removed.",
  "postazione.categoria.non.trovata": "Category not found",
  "postazione.categoria.spostata": "Moved.",

  "varianti.apri.con": "Choices on this dish ({n})",
  "varianti.apri.senza": "Add choices to this dish",
  "varianti.titolo": "Choices on this dish",
  "varianti.testo.prima": "What the guest picks when ordering ",
  "varianti.testo.enfasi": "this",
  "varianti.testo.dopo":
    " dish. To add another course, use the button at the bottom of the category.",
  "varianti.obbligatorio": "required",
  "varianti.facoltativo": "optional",
  "varianti.multiple": " · multiple choices",
  "varianti.elimina.gruppo": "Delete group",
  "varianti.senza": "No {nome}",
  "varianti.esaurito": "Out of stock",
  "varianti.ripristina": "Back in stock",
  "varianti.vuoto": "No choices yet: while it is empty, the group does not reach guests.",
  "varianti.opzione.segnaposto": "12 pieces, Avocado, Rare…",
  "varianti.supplemento": "Surcharge in euro",
  "varianti.aggiungi.scelta": "Add choice",
  "varianti.nuovo.gruppo": "New group of choices",
  "varianti.nuovo.gruppo.testo.prima":
    "This is not for adding dishes — that is done at the bottom of the category. Here you add the choices the guest makes ",
  "varianti.nuovo.gruppo.testo.enfasi": "on this dish",
  "varianti.nuovo.gruppo.testo.dopo":
    ": how it is cooked, the portion, the extra ingredients.",
  "varianti.gruppo.nome": "What the group is called",
  "varianti.gruppo.nome.segnaposto": "Cooking · Portion · Add · Leave out",
  "varianti.gruppo.tipo": "What kind of choice",
  "varianti.gruppo.tipo.scelta": "Choice — one of several, e.g. how it is cooked",
  "varianti.gruppo.tipo.aggiunta": "Add-on — paid extra, e.g. bacon +1.50",
  "varianti.gruppo.tipo.rimozione": "Removal — what to leave out, e.g. no onion",
  "varianti.gruppo.obbligatorio": "The guest has to choose",
  "varianti.gruppo.multiplo": "They can pick more than one",
  "varianti.gruppo.crea": "Create group",
  "varianti.errore.nome.gruppo": "The group needs a name",
  "varianti.errore.piatto": "Dish not found",
  "varianti.gruppo.creato": "Group created: now add the choices.",
  "varianti.gruppo.eliminato": "Group deleted",
  "varianti.errore.nome.scelta": "The choice needs a name",
  "varianti.errore.supplemento": "That surcharge is not valid",
  "varianti.errore.gruppo": "Group not found",
  "varianti.scelta.aggiunta": "Choice added",
  "varianti.scelta.eliminata": "Choice deleted",

  "traduzioni.lingue": "Menu languages",
  "traduzioni.nome": "Name — Italian: {italiano}",
  "traduzioni.descrizione": "Description — Italian: {italiano}",
  "traduzioni.ingredienti": "Ingredients",
  "traduzioni.nota":
    "Fields left empty stay in Italian: better than nothing, for whoever is reading.",
  "traduzioni.salvo": "Saving…",
  "traduzioni.salva": "Save translation",
  "traduzioni.errore.richiesta": "That request is not valid",
  "traduzioni.errore.piatto": "Dish not found",
  "traduzioni.salvato": "Saved",

  "lingue.testo":
    "Italian is always there. Choose the other languages you want to offer the menu in — this is the menu your guests read, not the interface language of this back office. Guests get a language switcher, and someone arriving with an English phone finds it already in English.",
  "lingue.salvo": "Saving…",
  "lingue.salva": "Save menu languages",
  "lingue.nessuna": "Menu in Italian only: guests get no language switcher.",
  "lingue.attivate": "{n} languages switched on. Translate the dishes below.",

  "applica.errore.tipo": "That format isn't recognised",
  "azione.copia_di": "Copy of {nome}",
  "applica.solo_categorie.uno": "{n} category added. The dishes are yours to load.",
  "applica.solo_categorie.molti": "{n} categories added. The dishes are yours to load.",
  "applica.solo_categorie.nessuna": "The categories were already there. Format set.",
  "applica.nulla":
    "Format set. There was nothing to add: the categories and choices already exist.",
  "applica.fatto":
    "Format set. {categorie} added, {gruppi} created on the dishes already there. Prices and options are yours to fine-tune, item by item.",
  "applica.fatto.categorie.uno": "{n} category",
  "applica.fatto.categorie.molti": "{n} categories",
  "applica.fatto.gruppi.uno": "{n} choice group",
  "applica.fatto.gruppi.molti": "{n} choice groups",
  "applica.nota.banco":
    " Counter service switched on: every guest has their own bill and their own number, and the home page becomes the Counter.",
  "applica.nota.iva.uno": " {n} item moved to its category's VAT rate: check it.",
  "applica.nota.iva.molti": " {n} items moved to their category's VAT rate: check them.",
  "applica.nota.listino.uno":
    " {n} sample item created, switched off: its price and allergens need checking before you switch it on — no guest sees it until you do.",
  "applica.nota.listino.molti":
    " {n} sample items created, all switched off: prices and allergens need checking before you switch them on — no guest sees them until you do.",
  "applica.nota.riapplica":
    " The categories that stay chargeable inside the set-price deal ({elenco}) are still empty: once you have loaded them, apply the format again. Items added afterwards are born inside the fixed price, and with the deal on, the bill never charges for them.",

  "formato.categorie": "Categories",
  "formato.scelte": "Suggested choices",
  "formato.gruppo.rimozione": "— what to leave out",
  "formato.gruppo.aggiunta": "— paid add-ons",
  "formato.gruppo.obbligatorio": "— required",
  "formato.gruppo.facoltativo": "— optional",
  "formato.promemoria.titolo": "Worth keeping in mind for this format",
  "formato.solo.categorie": "Categories only, without the choices",
  "formato.solo.categorie.nota":
    "Useful if you would rather set the options yourself, dish by dish.",
  "formato.listino": "Start from a sample price list ({n} items)",
  "formato.listino.nota.prima":
    "Names and allergens already filled in, so you are not typing them by hand on day one — allergens are the obligation that costs from 3,000 to 24,000 euro. Prices are indicative and need redoing: items are created ",
  "formato.listino.nota.spente": "switched off",
  "formato.listino.nota.dopo":
    " and no guest sees them until you switch them on yourself, one by one.",
  "formato.nota":
    "It touches nothing you already have: existing categories stay, and a group of choices with the same name is not overwritten. The choices are applied to dishes already loaded in the expected categories.",
  "formato.applico": "Applying…",
  "formato.applica": "Apply the {nome} template",

  "formato.ristorante.nome": "Restaurant",
  "formato.ristorante.descrizione": "With a wine list, courses and tasting menus.",
  "formato.pizzeria.nome": "Pizzeria",
  "formato.pizzeria.descrizione": "Doughs, sizes and toppings to add or leave out.",
  "formato.pizza_al_trancio.nome": "Pizza by the slice",
  "formato.pizza_al_trancio.descrizione":
    "Sold by the slice or by weight, takeaway and eat-in.",
  "formato.piadineria.nome": "Piadineria (flatbread wraps)",
  "formato.piadineria.descrizione": "Doughs, build-your-own fillings and add-ons.",
  "formato.sushi.nome": "Sushi / all you can eat",
  "formato.sushi.descrizione": "Orders in waves, with a gap between one and the next.",
  "formato.steak_house.nome": "Grill and steak house",
  "formato.steak_house.descrizione":
    "Cuts, cooking temperatures, dry-ageing and sides to choose.",
  "formato.paninoteca.nome": "Sandwich bar",
  "formato.paninoteca.descrizione": "Breads, fillings and combo deals.",
  "formato.hamburgeria.nome": "Burger restaurant",
  "formato.hamburgeria.descrizione":
    "Patties, buns, cooking temperatures, add-ons and doubles.",
  "formato.gintoneria.nome": "Gin bar and cocktail bar",
  "formato.gintoneria.descrizione": "Spirits, tonics and botanicals to build with.",
  "formato.birreria.nome": "Beer hall and pub",
  "formato.birreria.descrizione": "Draught and bottle, sizes and styles.",
  "formato.tisaneria.nome": "Herbal tea room and tea house",
  "formato.tisaneria.descrizione": "Infusions, sizes and things to go with them.",
  "formato.bar.nome": "Bar and coffee shop",
  "formato.bar.descrizione": "Coffee, breakfast, aperitivo.",

  "foto.cambia": "Change photo",
  "foto.aggiungi": "Add photo",
  "foto.caricamento": "Uploading…",
  "foto.limiti": "JPG, PNG or WEBP up to 300 KB",
  "foto.errore.piatto": "No dish given",
  "foto.errore.nessuna": "No image selected",
  "foto.errore.formato": "Format not supported: use JPG, PNG or WEBP",
  "foto.errore.peso": "Image too heavy (300 KB maximum)",
  "foto.errore.non.trovato": "Dish not found",

  "importa.testo.prima": "Upload an ",
  "importa.testo.excel": "Excel (.xlsx)",
  "importa.testo.dopo":
    ", CSV or TSV file. Dishes and drinks are supported, with category, type, size, producer, style, grape, service, photo, allergens, station, out-of-formula and tax details. The extra columns are optional, and missing categories are created on their own, on the station the file names.",
  "importa.esempio": "Download a sample file",
  "importa.in.corso": "Importing...",
  "importa.avvia": "Import menu",
  "importa.fatti": "{n} dishes imported.",
  "importa.saltate": "Rows skipped:",
  "importa.errore.nessun.file": "No file selected",
  "importa.errore.troppo.grande": "File too large (1 MB maximum)",
  "importa.errore.illeggibile":
    "File cannot be read: check that it is a valid CSV, TSV or Excel file",
  "importa.errore.vuoto": "The file is empty",
  "importa.errore.troppe.righe": "Too many rows ({max} maximum)",
  "importa.saltata.nome": "row {riga}: the dish name is missing",
  "importa.saltata.prezzo": "row {riga} ({nome}): price is not valid",
  "importa.saltata.iva": "row {riga} ({nome}): VAT (IVA) is not valid",
  "importa.iva.assunta.uno":
    "{n} row with no VAT (IVA) in the file: imported at 10%, the food-service rate. If there are wines or spirits, set them to 22% before you issue any invoices.",
  "importa.iva.assunta.molti":
    "{n} rows with no VAT (IVA) in the file: imported at 10%, the food-service rate. If there are wines or spirits, set them to 22% before you issue any invoices.",
  "importa.categorie.nuove.uno":
    "{n} new category created by the import: {elenco}. If that is not the right station, change it on the category below.",
  "importa.categorie.nuove.molti":
    "{n} new categories created by the import: {elenco}. If those are not the right stations, change them on the categories below.",

  "tilby.non.collegato.prima": "Connect your till system under ",
  "tilby.impostazioni": "Settings",
  "tilby.non.collegato.dopo":
    " to import the menu you already have, with the right prices and VAT (IVA).",
  "tilby.testo":
    "Realigns the menu with the one on the till: it updates prices and availability of the dishes already there and adds the new ones. It deletes nothing.",
  "tilby.in.corso": "Importing from Tilby...",
  "tilby.avvia": "Import from Tilby",
  "tilby.fatto": "{creati} dishes added, {aggiornati} updated.",
  "tilby.errore.non.collegato": "Tilby is not connected: set it up under Settings first",
  "tilby.errore.lettura": "Could not read from Tilby",
  "tilby.saltato.senza.nome": "Tilby item {id}: no name",
  "tilby.saltato.prezzo": "{nome}: price is not valid on the till",
  "tilby.iva.mancante.uno":
    "{n} item: the till did not declare the VAT (IVA). On items already there the rate you had set has been kept, new ones go in at 10% — check them if you also sell alcohol.",
  "tilby.iva.mancante.molti":
    "{n} items: the till did not declare the VAT (IVA). On items already there the rate you had set has been kept, new ones go in at 10% — check them if you also sell alcohol.",

  "etichetta.non.attiva.prima":
    "Want to fill the card in by photographing the label? Connect an OpenRouter key under ",
  "etichetta.impostazioni": "Settings",
  "etichetta.non.attiva.dopo": ".",
  "etichetta.leggo": "Reading the label…",
  "etichetta.compila": "Fill in from a photo of the label",
  "etichetta.limiti": "Label or tech sheet, up to 800 KB",
  "etichetta.proposta": "Suggestion — read it over before saving",
  "etichetta.allergeni": "Allergens: ",
  "etichetta.copia": "Copy into the fields below",
  "etichetta.campo.name": "Name",
  "etichetta.campo.producer": "Producer",
  "etichetta.campo.vintage": "Vintage",
  "etichetta.campo.denomination": "Denomination",
  "etichetta.campo.origin": "Region",
  "etichetta.campo.abv": "ABV",
  "etichetta.campo.ingredients": "Grapes",
  "etichetta.campo.description": "Description",
  "etichetta.errore.nessuna.foto": "No photo selected",
  "etichetta.errore.formato": "Format not supported: use JPG, PNG or WEBP",
  "etichetta.errore.peso": "Photo too heavy (800 KB maximum)",
  "etichetta.errore.non.attiva":
    "Reading from a photo is not switched on: connect an OpenRouter key under Settings.",
  "etichetta.errore.chiave":
    "The OpenRouter key cannot be read: enter it again under Settings.",
  "etichetta.errore.niente":
    "Nothing useful came out of the photo. Try again with more light, or fill it in by hand.",
  "etichetta.avviso.incerti": "Check by hand: {campi}.",
  "etichetta.avviso.rileggi":
    "Read the fields over before saving: what you write here is what the guest reads.",

  "chiave.rimossa": "Removed. Reading from a photo is no longer available.",
  "chiave.errore.incolla": "Paste in the OpenRouter key",
  "chiave.modello.aggiornato": "Model updated: {modello}. Key unchanged.",
  "chiave.errore.prefisso": "An OpenRouter key starts with sk-or-",
  "chiave.collegata":
    "Connected. Calls are charged to your own OpenRouter account, model {modello}.",

  "errore.piatto.non.indicato": "No dish given",
  "errore.nome.obbligatorio": "The name is required",
  "errore.prezzo": "That price is not valid",
  "errore.categoria": "That category is not valid",
  "errore.abbinamento.se.stesso": "A dish cannot be paired with itself",
  "errore.abbinamento": "That pairing is not valid",
  "errore.piatto.non.trovato": "Dish not found",
  "errore.nome.categoria": "The category name is missing",
  "errore.categoria.non.trovata": "Category not found",
};

export const tMenuAdmin = dizionario(IT, EN);

/* ------------------------------------------------------------------ *
 * Elenchi che vivono nei pacchetti condivisi.
 *
 * Allergeni, conservazione e diciture arrivano da `@repo/shared`, che non
 * è di quest'area: qui c'è solo il ponte fra la chiave salvata a database
 * e la voce già tradotta in comune.ts. La chiave non cambia mai — è quella
 * che sta nella colonna — e se non la riconosciamo si mostra com'è, che è
 * meglio di una casella vuota.
 * ------------------------------------------------------------------ */

const ALLERGENE_COMUNE = {
  glutine: "allergene.glutine",
  crostacei: "allergene.crostacei",
  uova: "allergene.uova",
  pesce: "allergene.pesce",
  arachidi: "allergene.arachidi",
  soia: "allergene.soia",
  latte: "allergene.latte",
  "frutta a guscio": "allergene.frutta a guscio",
  sedano: "allergene.sedano",
  senape: "allergene.senape",
  sesamo: "allergene.sesamo",
  solfiti: "allergene.solfiti",
  lupini: "allergene.lupini",
  molluschi: "allergene.molluschi",
} as const;

const CONSERVAZIONE_COMUNE = {
  fresco: "conservazione.fresco",
  congelato: "conservazione.congelato",
  surgelato: "conservazione.surgelato",
  abbattuto: "conservazione.abbattuto",
} as const;

const DICITURA_COMUNE = {
  vegetariano: "dicitura.vegetariano",
  vegano: "dicitura.vegano",
  senza_glutine: "dicitura.senza_glutine",
  senza_lattosio: "dicitura.senza_lattosio",
  piccante: "dicitura.piccante",
} as const;

/**
 * Gli esempi accanto a ciascuna casella.
 *
 * Stanno qui e non in comune.ts perché non sono di legge: il nome
 * dell'allergene è quello dell'Allegato II e non si tocca, mentre "grano,
 * segale, orzo" è solo un aiuto a riconoscerlo mentre si compila. La mappa
 * serve a passare dalla chiave a database — che è una stringa qualunque —
 * alla voce del dizionario, senza forzare il tipo.
 */
const ESEMPI_ALLERGENE = {
  glutine: "allergene.esempi.glutine",
  crostacei: "allergene.esempi.crostacei",
  uova: "allergene.esempi.uova",
  pesce: "allergene.esempi.pesce",
  arachidi: "allergene.esempi.arachidi",
  soia: "allergene.esempi.soia",
  latte: "allergene.esempi.latte",
  "frutta a guscio": "allergene.esempi.frutta a guscio",
  sedano: "allergene.esempi.sedano",
  senape: "allergene.esempi.senape",
  sesamo: "allergene.esempi.sesamo",
  solfiti: "allergene.esempi.solfiti",
  lupini: "allergene.esempi.lupini",
  molluschi: "allergene.esempi.molluschi",
} as const;

/** Il nome di legge di un allergene, dalla chiave salvata a database. */
export function nomeAllergene(chiave: string, lingua: LinguaUI): string {
  const voce = ALLERGENE_COMUNE[chiave as keyof typeof ALLERGENE_COMUNE];
  return voce ? tComune(lingua)(voce) : chiave;
}

/** Gli esempi con cui riconoscere un allergene, dalla chiave a database. */
export function esempiAllergene(chiave: string, lingua: LinguaUI): string {
  const voce = ESEMPI_ALLERGENE[chiave as keyof typeof ESEMPI_ALLERGENE];
  return voce ? tMenuAdmin(lingua)(voce) : "";
}

/** Lo stato di conservazione, dalla chiave salvata a database. */
export function nomeConservazione(chiave: string, lingua: LinguaUI): string {
  const voce = CONSERVAZIONE_COMUNE[chiave as keyof typeof CONSERVAZIONE_COMUNE];
  return voce ? tComune(lingua)(voce) : chiave;
}

/** La dicitura dietetica, dalla chiave salvata a database. */
export function nomeDicitura(chiave: string, lingua: LinguaUI): string {
  const voce = DICITURA_COMUNE[chiave as keyof typeof DICITURA_COMUNE];
  return voce ? tComune(lingua)(voce) : chiave;
}

/**
 * I promemoria dei formati, in inglese.
 *
 * Stanno in `packages/shared/formati.ts` come semplici stringhe dentro un
 * elenco, senza chiave: cercarli per posizione si romperebbe in silenzio il
 * giorno che qualcuno ne aggiunge uno in mezzo, e mostrerebbe l'avvertenza
 * sbagliata su una cosa che riguarda una sanzione. La chiave è quindi il
 * testo italiano esatto, e un promemoria nuovo resta in italiano invece di
 * sparire.
 */
const PROMEMORIA_EN: Record<string, string> = {
  "Ogni vino con più di 10 mg/l di solfiti va dichiarato: praticamente tutti.":
    "Every wine over 10 mg/l of sulphites has to be declared: which is practically all of them.",
  "Il calice e la bottiglia sono due prezzi dello stesso vino: mettili come formato, non come due voci.":
    "Glass and bottle are two prices for the same wine: set them as sizes, not as two separate items.",
  "Il pesce servito crudo va abbattuto e dichiarato (Reg. CE 853/2004).":
    "Fish served raw must be blast-chilled and declared (Reg. EC 853/2004).",
  "Se hai un menu degustazione, caricalo come piatto unico con le scelte dentro.":
    "If you run a tasting menu, load it as a single item with the choices inside it.",

  "L'impasto senza glutine richiede piano e forno separati: se non puoi garantirlo, non offrirlo.":
    "Gluten-free dough needs a separate surface and oven: if you cannot guarantee that, do not offer it.",
  "La mozzarella surgelata va dichiarata come tutto il resto.":
    "Deep-frozen mozzarella has to be declared like everything else.",
  "Le rimozioni servono anche a chi ha un'intolleranza: meglio una casella che una nota scritta a mano.":
    "Removals also serve guests with an intolerance: a tick box beats a handwritten note.",
  "Il glutine è un allergene: indicalo su tutte le pizze, non solo su quelle speciali.":
    "Gluten is an allergen: mark it on every pizza, not only on the speciality ones.",

  "Se vendi a peso, il prezzo al chilo va esposto: qui puoi caricare solo prezzi fissi per formato.":
    "If you sell by weight, the price per kilo must be displayed: here you can only load fixed prices per size.",
  "L'asporto ha un'IVA diversa dal consumo sul posto: controlla l'aliquota su ogni voce.":
    "Takeaway carries a different VAT (IVA) rate from eating in: check the rate on every item.",
  "Un trancio esposto in vetrina resta soggetto all'obbligo sugli allergeni.":
    "A slice on display in the window is still covered by the allergen obligation.",

  "La piadina classica contiene strutto: dichiaralo, non è scontato per chi non mangia maiale.":
    "The classic piadina contains lard: declare it, it is not obvious to a guest who does not eat pork.",
  "Il senza glutine va cotto su piastra separata, altrimenti non è senza glutine.":
    "Gluten-free has to be cooked on a separate griddle, otherwise it is not gluten free.",

  "Il pesce servito crudo va abbattuto a -20 °C per 24 ore: è obbligatorio (Reg. CE 853/2004), e in menù va dichiarato che il prodotto è stato sottoposto a bonifica preventiva.":
    "Fish served raw must be blast-chilled to -20 °C for 24 hours: it is mandatory (Reg. EC 853/2004), and the menu has to state that the product has undergone preventive treatment.",
  "Pesce, crostacei, molluschi, soia, sesamo e uova sono tutti nell'Allegato II: su una carta sushi gli allergeni riguardano quasi ogni voce.":
    "Fish, crustaceans, molluscs, soybeans, sesame and eggs are all in Annex II: on a sushi list the allergens touch almost every item.",
  "Nella formula a prezzo fisso, imposta l'intervallo fra le ordinazioni in Impostazioni: senza, un tavolo da sei manda ottanta piatti in tre minuti e metà restano nel piatto.":
    "On the fixed-price deal, set the gap between orders under Settings: without it, a table of six sends eighty dishes in three minutes and half of them come back untouched.",
  "Se applichi un supplemento per l'avanzato non consumato, va scritto sul menù prima dell'ordinazione, non sul conto.":
    "If you charge a surcharge for food left uneaten, it has to be written on the menu before ordering, not on the bill.",

  "L'origine della carne bovina è obbligatoria (Reg. CE 1760/2000): nato, allevato e macellato.":
    "The origin of beef is mandatory (Reg. EC 1760/2000): born, reared and slaughtered.",
  "Se dichiari la frollatura, scrivi i giorni: è quello che il cliente confronta.":
    "If you state the dry-ageing, write the number of days: that is what the guest compares.",
  "La cottura al sangue su carne trita va sconsigliata per iscritto: è un rischio microbiologico, non una preferenza.":
    "Rare cooking on minced meat has to be advised against in writing: it is a microbiological risk, not a preference.",
  "Per i tagli venduti al chilo qui puoi solo mettere pesi fissi: il prezzo al chilo va esposto a parte.":
    "For cuts sold by the kilo you can only set fixed weights here: the price per kilo must be displayed separately.",

  "Il pane senza glutine non basta: anche affettati e salse vanno verificati.":
    "Gluten-free bread is not enough: cured meats and sauces have to be checked too.",
  "Se fai il menu panino più patatine più bibita, oggi va caricato come voce a sé col prezzo del combinato.":
    "If you run a sandwich plus fries plus drink deal, for now load it as its own item at the combo price.",

  "Sulla carne trita la cottura al sangue va sconsigliata per iscritto: è un rischio, non un gusto.":
    "On minced meat, rare cooking has to be advised against in writing: it is a risk, not a taste.",
  "Se il bun senza glutine viene tostato sulla stessa piastra, non è senza glutine.":
    "If the gluten-free bun is toasted on the same griddle, it is not gluten free.",
  "L'origine della carne bovina è obbligatoria anche per gli hamburger.":
    "The origin of beef is mandatory for burgers too.",

  "Il gin tonic si compone: mettilo come una voce sola con gin e tonica come scelte, non come venti voci diverse.":
    "A gin and tonic gets built: set it as one item with gin and tonic as choices, not as twenty separate items.",
  "La gradazione va indicata sui distillati: è quello che il cliente confronta.":
    "ABV has to be shown on spirits: that is what the guest compares.",
  "Anidride solforosa e solfiti compaiono in vermouth e vini liquorosi: sono allergeni.":
    "Sulphur dioxide and sulphites turn up in vermouth and fortified wines: they are allergens.",
  "Se servi analcolici, dichiaralo chiaramente: chi guida te ne è grato e torna.":
    "If you serve alcohol-free drinks, say so clearly: the guest who is driving is grateful and comes back.",
  "Somministrare alcol a minori di 18 anni è vietato: il servizio al tavolo non ti esonera dal controllo.":
    "Serving alcohol to under-18s is forbidden: table service does not excuse you from checking.",

  "Il glutine è nella birra: va dichiarato, anche se sembra scontato.":
    "Gluten is in beer: it has to be declared, obvious as it may seem.",
  "Gradazione e stile vanno in scheda: sono i due dati per cui si sceglie una birra.":
    "ABV and style belong on the card: they are the two figures a beer gets chosen on.",
  "Se una spina finisce, segnala il formato esaurito invece di togliere la birra: la rimetti in un tocco.":
    "When a keg runs out, mark that size out of stock instead of removing the beer: you put it back with one tap.",
  "Le birre analcoliche non sono a zero alcol per legge: se scrivi 0,0% controlla l'etichetta.":
    "Alcohol-free beers are not legally zero alcohol: if you write 0.0%, check the label.",

  "Il tè contiene teina: indicalo su chi cerca l'infuso senza, la sera è la domanda più frequente.":
    "Tea contains caffeine: flag it for guests looking for an infusion without, in the evening it is the most common question.",
  "Frutta a guscio e sedano compaiono spesso nelle tisane: sono allergeni.":
    "Nuts and celery turn up often in herbal teas: they are allergens.",
  "Una tisana non è un integratore: evita in carta indicazioni salutistiche, sono vietate senza claim autorizzati.":
    "A herbal tea is not a supplement: keep health statements off the list, they are forbidden without authorised claims.",
  "Se hai pochi piatti o nessuno, togli le categorie che non usi: un menu con sezioni vuote sembra incompleto.":
    "If you have few dishes or none, drop the categories you do not use: a menu with empty sections looks unfinished.",

  "Il prezzo al banco e al tavolo può differire: se lo fai, va esposto.":
    "The price at the counter and at the table may differ: if you do that, it has to be displayed.",
  "Latte e frutta a guscio sono allergeni: valgono anche per la caffetteria.":
    "Milk and nuts are allergens: they count for the coffee side too.",
};

/** Un promemoria di formato, nella lingua di chi sta compilando il menu. */
export function promemoriaTradotto(testo: string, lingua: LinguaUI): string {
  return lingua === "en" ? (PROMEMORIA_EN[testo] ?? testo) : testo;
}
