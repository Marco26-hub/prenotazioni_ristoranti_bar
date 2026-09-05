/**
 * Modelli di menu per formato di locale.
 *
 * Una pizzeria e una steak house non compilano il menu allo stesso modo:
 * cambiano le categorie, i gruppi di scelte e gli obblighi che il
 * ristoratore dimentica. Partire da una pagina vuota significa che il menu
 * verrà caricato male, o non verrà caricato affatto.
 *
 * I promemoria non sono decorazione: sono le cose per cui un locale prende
 * una sanzione o perde un cliente, raccolte per formato.
 */

export type TipoLocale =
  | "ristorante"
  | "pizzeria"
  | "pizza_al_trancio"
  | "piadineria"
  | "sushi"
  | "steak_house"
  | "paninoteca"
  | "hamburgeria"
  | "bar"
  | "gintoneria"
  | "birreria"
  | "tisaneria";

export type TipoGruppo = "scelta" | "aggiunta" | "rimozione";

export interface GruppoModello {
  nome: string;
  /** Nomi delle categorie a cui applicarlo. Vuoto = tutte. */
  categorie: string[];
  tipo: TipoGruppo;
  obbligatorio: boolean;
  multiplo: boolean;
  /** [nome, supplemento in centesimi] */
  opzioni: Array<[string, number]>;
}

/**
 * Come si lavora, non solo com'è fatto il menu.
 *
 * Il formato descriveva le categorie e i gruppi di scelte, e basta: una
 * piadineria applicava il suo modello e si ritrovava comunque la sala dei
 * tavoli, con un QR per tavolo e un conto condiviso — che in una piadineria
 * vuol dire la piadina del secondo cliente sul conto del primo.
 *
 * Questi sono i valori di partenza, non una gabbia: restano tutti
 * interruttori che il locale può cambiare, perché un ristorante può fare
 * asporto e una piadineria può avere quattro tavolini.
 */
export interface ModoLavoro {
  /** Si consegna al bancone: ogni cliente è il proprio conto. */
  alBanco?: boolean;
  /** Ogni ordine prende un numero. */
  numeriRitiro?: boolean;
}

/**
 * Una categoria del menu, con quello che serve a farla funzionare.
 *
 * Il nome da solo non basta. Il reparto decide su quale schermo compare la
 * comanda e chi la può muovere: senza, i cocktail di una gintoneria
 * finiscono sullo schermo della cucina e il barista — che ha il permesso
 * solo sul bar — non può toccarli. L'aliquota cambia fra cibo e alcolici, e
 * lasciarla al 10% su una carta di gin è un errore fiscale silenzioso. E in
 * una formula a prezzo fisso ci sono categorie che restano a pagamento.
 */
export interface CategoriaModello {
  nome: string;
  /** cucina, bar, pizzeria, pasticceria. Dove si prepara. */
  reparto?: "cucina" | "bar" | "pizzeria" | "pasticceria";
  /** Aliquota suggerita: 22 per gli alcolici, 10 per la somministrazione. */
  iva?: number;
  /** Resta a pagamento anche dentro una formula a prezzo fisso. */
  fuoriFormula?: boolean;
  /** Come si presenta al cliente: cambia la scheda del piatto. */
  genere?: "food" | "wine" | "beer" | "drink";
}

export interface ModelloLocale {
  tipo: TipoLocale;
  nome: string;
  descrizione: string;
  categorie: CategoriaModello[];
  gruppi: GruppoModello[];
  /** Quello che in quel formato si dimentica sempre. */
  promemoria: string[];
  /** Come parte il locale, se il formato lo suggerisce. */
  modo?: ModoLavoro;
}

const COTTURA_CARNE: GruppoModello = {
  nome: "Cottura",
  categorie: [],
  tipo: "scelta",
  obbligatorio: true,
  multiplo: false,
  opzioni: [
    ["Al sangue", 0],
    ["Media", 0],
    ["Ben cotta", 0],
  ],
};

export const MODELLI: ModelloLocale[] = [
  {
    tipo: "ristorante",
    nome: "Ristorante",
    descrizione: "Con carta dei vini, portate e menu degustazione.",
    categorie: [
      { nome: "Antipasti" },
      { nome: "Primi" },
      { nome: "Secondi" },
      { nome: "Contorni" },
      { nome: "Dolci", reparto: "pasticceria", fuoriFormula: true },
      { nome: "Vini", reparto: "bar", iva: 22, genere: "wine", fuoriFormula: true },
      { nome: "Bevande", reparto: "bar", genere: "drink", fuoriFormula: true },
    ],
    gruppi: [
      {
        nome: "Preparazione",
        categorie: ["Primi", "Secondi"],
        tipo: "scelta",
        obbligatorio: false,
        multiplo: false,
        opzioni: [
          ["Come da ricetta", 0],
          ["Senza glutine", 200],
          ["Senza lattosio", 0],
        ],
      },
      {
        nome: "Formato",
        categorie: ["Vini"],
        tipo: "scelta",
        obbligatorio: true,
        multiplo: false,
        opzioni: [
          ["Calice", 0],
          ["Bottiglia 0,75L", 0],
          ["Magnum 1,5L", 0],
        ],
      },
      {
        nome: "Porzione",
        categorie: ["Primi"],
        tipo: "scelta",
        obbligatorio: false,
        multiplo: false,
        opzioni: [
          ["Mezza porzione", -400],
          ["Porzione intera", 0],
        ],
      },
    ],
    promemoria: [
      "Ogni vino con più di 10 mg/l di solfiti va dichiarato: praticamente tutti.",
      "Il calice e la bottiglia sono due prezzi dello stesso vino: mettili come formato, non come due voci.",
      "Il pesce servito crudo va abbattuto e dichiarato (Reg. CE 853/2004).",
      "Se hai un menu degustazione, caricalo come piatto unico con le scelte dentro.",
    ],
  },
  {
    tipo: "pizzeria",
    nome: "Pizzeria",
    descrizione: "Impasti, formati e ingredienti da aggiungere o togliere.",
    categorie: [
      { nome: "Antipasti e fritti" },
      { nome: "Pizze classiche", reparto: "pizzeria" },
      { nome: "Pizze speciali", reparto: "pizzeria" },
      { nome: "Dolci", reparto: "pasticceria", fuoriFormula: true },
      { nome: "Bevande", reparto: "bar", genere: "drink", fuoriFormula: true },
      { nome: "Birre", reparto: "bar", iva: 22, genere: "beer", fuoriFormula: true },
    ],
    gruppi: [
      {
        nome: "Impasto",
        categorie: ["Pizze classiche", "Pizze speciali"],
        tipo: "scelta",
        obbligatorio: true,
        multiplo: false,
        opzioni: [
          ["Classico", 0],
          ["Integrale", 100],
          ["Maturazione 48 ore", 150],
          ["Senza glutine", 300],
        ],
      },
      {
        nome: "Formato",
        categorie: ["Pizze classiche", "Pizze speciali"],
        tipo: "scelta",
        obbligatorio: false,
        multiplo: false,
        opzioni: [
          ["Normale", 0],
          ["Baby", -300],
          ["Maxi", 400],
        ],
      },
      {
        nome: "Aggiungi",
        categorie: ["Pizze classiche", "Pizze speciali"],
        tipo: "aggiunta",
        obbligatorio: false,
        multiplo: true,
        opzioni: [
          ["Bufala", 250],
          ["Nduja", 200],
          ["Funghi porcini", 300],
          ["Prosciutto crudo", 300],
          ["Burrata", 300],
        ],
      },
      {
        nome: "Togli",
        categorie: ["Pizze classiche", "Pizze speciali"],
        tipo: "rimozione",
        obbligatorio: false,
        multiplo: true,
        opzioni: [
          ["Cipolla", 0],
          ["Origano", 0],
          ["Basilico", 0],
          ["Aglio", 0],
        ],
      },
      {
        nome: "Cottura",
        categorie: ["Pizze classiche", "Pizze speciali"],
        tipo: "scelta",
        obbligatorio: false,
        multiplo: false,
        opzioni: [
          ["Normale", 0],
          ["Ben cotta", 0],
          ["Poco cotta", 0],
        ],
      },
    ],
    promemoria: [
      "L'impasto senza glutine richiede piano e forno separati: se non puoi garantirlo, non offrirlo.",
      "La mozzarella surgelata va dichiarata come tutto il resto.",
      "Le rimozioni servono anche a chi ha un'intolleranza: meglio una casella che una nota scritta a mano.",
      "Il glutine è un allergene: indicalo su tutte le pizze, non solo su quelle speciali.",
    ],
  },
  {
    tipo: "pizza_al_trancio",
    // Si consegna al bancone: la gente si siede dove capita, o non si siede.
    modo: { alBanco: true, numeriRitiro: true },
    nome: "Pizza al trancio",
    descrizione: "Vendita a trancio o a peso, da asporto e sul posto.",
    categorie: [
      { nome: "Pizze al trancio", reparto: "pizzeria" },
      { nome: "Fritti" },
      { nome: "Bevande", reparto: "bar", genere: "drink", fuoriFormula: true },
    ],
    gruppi: [
      {
        nome: "Formato",
        categorie: ["Pizze al trancio"],
        tipo: "scelta",
        obbligatorio: true,
        multiplo: false,
        opzioni: [
          ["Trancio", 0],
          ["Mezzo trancio", -200],
          ["Teglia intera", 1800],
        ],
      },
      {
        nome: "Servizio",
        categorie: ["Pizze al trancio"],
        tipo: "scelta",
        obbligatorio: false,
        multiplo: false,
        opzioni: [
          ["Da mangiare qui", 0],
          ["Da asporto", 0],
          ["Riscaldare", 0],
        ],
      },
    ],
    promemoria: [
      "Se vendi a peso, il prezzo al chilo va esposto: qui puoi caricare solo prezzi fissi per formato.",
      "L'asporto ha un'IVA diversa dal consumo sul posto: controlla l'aliquota su ogni voce.",
      "Un trancio esposto in vetrina resta soggetto all'obbligo sugli allergeni.",
    ],
  },
  {
    tipo: "piadineria",
    // Si consegna al bancone: la gente si siede dove capita, o non si siede.
    modo: { alBanco: true, numeriRitiro: true },
    nome: "Piadineria",
    descrizione: "Impasti, farciture componibili e aggiunte.",
    categorie: [
      { nome: "Piadine" },
      { nome: "Crescioni" },
      { nome: "Insalate" },
      { nome: "Dolci", reparto: "pasticceria", fuoriFormula: true },
      { nome: "Bevande", reparto: "bar", genere: "drink", fuoriFormula: true },
    ],
    gruppi: [
      {
        nome: "Impasto",
        categorie: ["Piadine", "Crescioni"],
        tipo: "scelta",
        obbligatorio: true,
        multiplo: false,
        opzioni: [
          ["Classica", 0],
          ["Integrale", 50],
          ["Senza strutto", 50],
          ["Senza glutine", 250],
        ],
      },
      {
        nome: "Aggiungi",
        categorie: ["Piadine", "Crescioni", "Insalate"],
        tipo: "aggiunta",
        obbligatorio: false,
        multiplo: true,
        opzioni: [
          ["Squacquerone", 150],
          ["Rucola", 100],
          ["Prosciutto crudo", 200],
          ["Grigliata di verdure", 150],
        ],
      },
      {
        nome: "Togli",
        categorie: ["Piadine", "Crescioni", "Insalate"],
        tipo: "rimozione",
        obbligatorio: false,
        multiplo: true,
        opzioni: [
          ["Cipolla", 0],
          ["Maionese", 0],
          ["Rucola", 0],
        ],
      },
    ],
    promemoria: [
      "La piadina classica contiene strutto: dichiaralo, non è scontato per chi non mangia maiale.",
      "Il senza glutine va cotto su piastra separata, altrimenti non è senza glutine.",
    ],
  },
  {
    tipo: "sushi",
    nome: "Sushi / All you can eat",
    descrizione: "Ordinazioni a ondate, con intervallo fra una e l'altra.",
    categorie: [
      { nome: "Antipasti" },
      { nome: "Nigiri" },
      { nome: "Sashimi" },
      { nome: "Uramaki" },
      { nome: "Hosomaki" },
      { nome: "Temaki" },
      { nome: "Fritti" },
      { nome: "Wok e riso" },
      { nome: "Dolci", reparto: "pasticceria", fuoriFormula: true },
      { nome: "Bevande", reparto: "bar", genere: "drink", fuoriFormula: true },
    ],
    gruppi: [
      {
        nome: "Pezzi",
        categorie: ["Nigiri", "Sashimi", "Uramaki", "Hosomaki"],
        tipo: "scelta",
        obbligatorio: true,
        multiplo: false,
        opzioni: [
          ["2 pezzi", 0],
          ["4 pezzi", 200],
          ["8 pezzi", 550],
        ],
      },
      {
        nome: "Salse",
        categorie: ["Nigiri", "Sashimi", "Uramaki", "Hosomaki", "Temaki", "Fritti"],
        tipo: "aggiunta",
        obbligatorio: false,
        multiplo: true,
        opzioni: [
          ["Zenzero", 0],
          ["Wasabi", 0],
          ["Salsa di soia", 0],
          ["Salsa teriyaki", 50],
          ["Maionese piccante", 50],
        ],
      },
      {
        nome: "Togli",
        categorie: ["Uramaki", "Hosomaki", "Temaki", "Wok e riso"],
        tipo: "rimozione",
        obbligatorio: false,
        multiplo: true,
        opzioni: [
          ["Avocado", 0],
          ["Philadelphia", 0],
          ["Sesamo", 0],
          ["Cipollotto", 0],
        ],
      },
    ],
    promemoria: [
      "Il pesce servito crudo va abbattuto a -20 \u00b0C per 24 ore: \u00e8 obbligatorio (Reg. CE 853/2004), e in men\u00f9 va dichiarato che il prodotto \u00e8 stato sottoposto a bonifica preventiva.",
      "Pesce, crostacei, molluschi, soia, sesamo e uova sono tutti nell'Allegato II: su una carta sushi gli allergeni riguardano quasi ogni voce.",
      "Nella formula a prezzo fisso, imposta l'intervallo fra le ordinazioni in Impostazioni: senza, un tavolo da sei manda ottanta piatti in tre minuti e met\u00e0 restano nel piatto.",
      "Se applichi un supplemento per l'avanzato non consumato, va scritto sul men\u00f9 prima dell'ordinazione, non sul conto.",
    ],
  },
  {
    tipo: "steak_house",
    nome: "Grill e steak house",
    descrizione: "Tagli, cotture, frollature e contorni a scelta.",
    categorie: [
      { nome: "Antipasti" },
      { nome: "Tagli di carne" },
      { nome: "Hamburger" },
      { nome: "Contorni" },
      { nome: "Dolci", reparto: "pasticceria", fuoriFormula: true },
      { nome: "Vini", reparto: "bar", iva: 22, genere: "wine", fuoriFormula: true },
      { nome: "Birre", reparto: "bar", iva: 22, genere: "beer", fuoriFormula: true },
    ],
    gruppi: [
      { ...COTTURA_CARNE, categorie: ["Tagli di carne", "Hamburger"] },
      {
        nome: "Peso",
        categorie: ["Tagli di carne"],
        tipo: "scelta",
        obbligatorio: true,
        multiplo: false,
        opzioni: [
          ["300 g", 0],
          ["500 g", 900],
          ["800 g", 1900],
        ],
      },
      {
        nome: "Contorno incluso",
        categorie: ["Tagli di carne"],
        tipo: "scelta",
        obbligatorio: true,
        multiplo: false,
        opzioni: [
          ["Patate al forno", 0],
          ["Insalata mista", 0],
          ["Verdure grigliate", 0],
        ],
      },
      {
        nome: "Salse",
        categorie: ["Tagli di carne", "Hamburger"],
        tipo: "aggiunta",
        obbligatorio: false,
        multiplo: true,
        opzioni: [
          ["Salsa al pepe verde", 150],
          ["Burro alle erbe", 100],
          ["Barbecue", 100],
        ],
      },
    ],
    promemoria: [
      "L'origine della carne bovina è obbligatoria (Reg. CE 1760/2000): nato, allevato e macellato.",
      "Se dichiari la frollatura, scrivi i giorni: è quello che il cliente confronta.",
      "La cottura al sangue su carne trita va sconsigliata per iscritto: è un rischio microbiologico, non una preferenza.",
      "Per i tagli venduti al chilo qui puoi solo mettere pesi fissi: il prezzo al chilo va esposto a parte.",
    ],
  },
  {
    tipo: "paninoteca",
    // Si consegna al bancone: la gente si siede dove capita, o non si siede.
    modo: { alBanco: true, numeriRitiro: true },
    nome: "Paninoteca",
    descrizione: "Pane, farciture e menu combinati.",
    categorie: [
      { nome: "Panini" },
      { nome: "Piadine" },
      { nome: "Fritti" },
      { nome: "Bevande", reparto: "bar", genere: "drink", fuoriFormula: true },
      { nome: "Birre", reparto: "bar", iva: 22, genere: "beer", fuoriFormula: true },
    ],
    gruppi: [
      {
        nome: "Pane",
        categorie: ["Panini"],
        tipo: "scelta",
        obbligatorio: true,
        multiplo: false,
        opzioni: [
          ["Classico", 0],
          ["Integrale", 50],
          ["Ai cereali", 50],
          ["Senza glutine", 200],
        ],
      },
      {
        nome: "Aggiungi",
        categorie: ["Panini", "Piadine"],
        tipo: "aggiunta",
        obbligatorio: false,
        multiplo: true,
        opzioni: [
          ["Bacon", 150],
          ["Formaggio extra", 100],
          ["Uovo", 100],
          ["Patatine dentro", 100],
        ],
      },
      {
        nome: "Togli",
        categorie: ["Panini", "Piadine"],
        tipo: "rimozione",
        obbligatorio: false,
        multiplo: true,
        opzioni: [
          ["Cipolla", 0],
          ["Salse", 0],
          ["Insalata", 0],
          ["Pomodoro", 0],
        ],
      },
    ],
    promemoria: [
      "Il pane senza glutine non basta: anche affettati e salse vanno verificati.",
      "Se fai il menu panino più patatine più bibita, oggi va caricato come voce a sé col prezzo del combinato.",
    ],
  },
  {
    tipo: "hamburgeria",
    nome: "Hamburgeria",
    descrizione: "Carne, pane, cotture, aggiunte e doppie.",
    categorie: [
      { nome: "Hamburger" },
      { nome: "Sfizi e fritti" },
      { nome: "Insalate" },
      { nome: "Dolci", reparto: "pasticceria", fuoriFormula: true },
      { nome: "Bevande", reparto: "bar", genere: "drink", fuoriFormula: true },
      { nome: "Birre", reparto: "bar", iva: 22, genere: "beer", fuoriFormula: true },
    ],
    gruppi: [
      { ...COTTURA_CARNE, categorie: ["Hamburger"] },
      {
        nome: "Formato",
        categorie: ["Hamburger"],
        tipo: "scelta",
        obbligatorio: false,
        multiplo: false,
        opzioni: [
          ["Singolo", 0],
          ["Doppia carne", 400],
        ],
      },
      {
        nome: "Pane",
        categorie: ["Hamburger"],
        tipo: "scelta",
        obbligatorio: true,
        multiplo: false,
        opzioni: [
          ["Bun classico", 0],
          ["Bun ai sesami", 0],
          ["Senza glutine", 200],
          ["Senza pane, in insalata", 0],
        ],
      },
      {
        nome: "Aggiungi",
        categorie: ["Hamburger"],
        tipo: "aggiunta",
        obbligatorio: false,
        multiplo: true,
        opzioni: [
          ["Bacon", 150],
          ["Cheddar", 100],
          ["Uovo", 100],
          ["Cipolla caramellata", 100],
        ],
      },
      {
        nome: "Togli",
        categorie: ["Hamburger"],
        tipo: "rimozione",
        obbligatorio: false,
        multiplo: true,
        opzioni: [
          ["Cipolla", 0],
          ["Salsa", 0],
          ["Pomodoro", 0],
          ["Cetriolini", 0],
        ],
      },
    ],
    promemoria: [
      "Sulla carne trita la cottura al sangue va sconsigliata per iscritto: è un rischio, non un gusto.",
      "Se il bun senza glutine viene tostato sulla stessa piastra, non è senza glutine.",
      "L'origine della carne bovina è obbligatoria anche per gli hamburger.",
    ],
  },
  {
    tipo: "gintoneria",
    nome: "Gintoneria e cocktail bar",
    descrizione: "Distillati, toniche e botaniche da comporre.",
    categorie: [
      { nome: "Gin tonic", reparto: "bar", iva: 22, genere: "drink", fuoriFormula: true },
      { nome: "Signature", reparto: "bar", iva: 22, genere: "drink", fuoriFormula: true },
      { nome: "Classici", reparto: "bar", iva: 22, genere: "drink", fuoriFormula: true },
      { nome: "Distillati lisci", reparto: "bar", iva: 22, genere: "drink", fuoriFormula: true },
      { nome: "Taglieri e sfizi" },
    ],
    gruppi: [
      {
        nome: "Gradazione",
        categorie: ["Cocktail"],
        tipo: "scelta",
        obbligatorio: false,
        multiplo: false,
        opzioni: [
          ["Come da ricetta", 0],
          ["Analcolico", 0],
        ],
      },
      {
        nome: "Gin",
        categorie: ["Gin tonic"],
        tipo: "scelta",
        obbligatorio: true,
        multiplo: false,
        opzioni: [
          ["London dry", 0],
          ["Agrumato", 100],
          ["Speziato", 100],
          ["Navy strength", 300],
        ],
      },
      {
        nome: "Tonica",
        categorie: ["Gin tonic"],
        tipo: "scelta",
        obbligatorio: true,
        multiplo: false,
        opzioni: [
          ["Classica", 0],
          ["Mediterranea", 100],
          ["Al sambuco", 100],
          ["Light", 0],
        ],
      },
      {
        nome: "Botaniche",
        categorie: ["Gin tonic", "Signature"],
        tipo: "aggiunta",
        obbligatorio: false,
        multiplo: true,
        opzioni: [
          ["Scorza di pompelmo", 0],
          ["Cetriolo", 0],
          ["Pepe rosa", 0],
          ["Rosmarino", 0],
          ["Bacche di ginepro", 0],
        ],
      },
      {
        nome: "Ghiaccio",
        categorie: ["Gin tonic", "Signature", "Classici", "Distillati lisci"],
        tipo: "scelta",
        obbligatorio: false,
        multiplo: false,
        opzioni: [
          ["Normale", 0],
          ["Poco ghiaccio", 0],
          ["Senza ghiaccio", 0],
        ],
      },
    ],
    promemoria: [
      "Il gin tonic si compone: mettilo come una voce sola con gin e tonica come scelte, non come venti voci diverse.",
      "La gradazione va indicata sui distillati: è quello che il cliente confronta.",
      "Anidride solforosa e solfiti compaiono in vermouth e vini liquorosi: sono allergeni.",
      "Se servi analcolici, dichiaralo chiaramente: chi guida te ne è grato e torna.",
      "Somministrare alcol a minori di 18 anni è vietato: il servizio al tavolo non ti esonera dal controllo.",
    ],
  },
  {
    tipo: "birreria",
    nome: "Birreria e pub",
    descrizione: "Spina e bottiglia, formati e stili.",
    categorie: [
      { nome: "Alla spina", reparto: "bar", iva: 22, genere: "beer", fuoriFormula: true },
      { nome: "In bottiglia", reparto: "bar", iva: 22, genere: "beer", fuoriFormula: true },
      { nome: "Cucina" },
      { nome: "Fritti" },
      { nome: "Distillati", reparto: "bar", iva: 22, genere: "drink", fuoriFormula: true },
    ],
    gruppi: [
      {
        nome: "Formato",
        categorie: ["Alla spina"],
        tipo: "scelta",
        obbligatorio: true,
        multiplo: false,
        opzioni: [
          ["Piccola 0,2L", 0],
          ["Media 0,4L", 200],
          ["Pinta 0,5L", 300],
        ],
      },
      {
        nome: "Servizio",
        categorie: ["Alla spina", "In bottiglia"],
        tipo: "scelta",
        obbligatorio: false,
        multiplo: false,
        opzioni: [
          ["Normale", 0],
          ["Bicchiere ghiacciato", 0],
        ],
      },
    ],
    promemoria: [
      "Il glutine è nella birra: va dichiarato, anche se sembra scontato.",
      "Gradazione e stile vanno in scheda: sono i due dati per cui si sceglie una birra.",
      "Se una spina finisce, segnala il formato esaurito invece di togliere la birra: la rimetti in un tocco.",
      "Le birre analcoliche non sono a zero alcol per legge: se scrivi 0,0% controlla l'etichetta.",
    ],
  },
  {
    tipo: "tisaneria",
    nome: "Tisaneria e sala da tè",
    descrizione: "Infusi, formati e accompagnamenti.",
    categorie: [
      { nome: "Tè", reparto: "bar", genere: "drink", fuoriFormula: true },
      { nome: "Tisane e infusi", reparto: "bar", genere: "drink", fuoriFormula: true },
      { nome: "Caffetteria", reparto: "bar", genere: "drink", fuoriFormula: true },
      { nome: "Dolci", reparto: "pasticceria", fuoriFormula: true },
      { nome: "Salato" },
    ],
    gruppi: [
      {
        nome: "Formato",
        categorie: ["Tè", "Tisane e infusi"],
        tipo: "scelta",
        obbligatorio: true,
        multiplo: false,
        opzioni: [
          ["Tazza", 0],
          ["Teiera piccola", 200],
          ["Teiera grande", 400],
        ],
      },
      {
        nome: "Accompagnamento",
        categorie: ["Tè", "Tisane e infusi", "Caffetteria"],
        tipo: "aggiunta",
        obbligatorio: false,
        multiplo: true,
        opzioni: [
          ["Miele", 50],
          ["Limone", 0],
          ["Latte", 0],
          ["Latte vegetale", 50],
          ["Zenzero fresco", 50],
        ],
      },
    ],
    promemoria: [
      "Il tè contiene teina: indicalo su chi cerca l'infuso senza, la sera è la domanda più frequente.",
      "Frutta a guscio e sedano compaiono spesso nelle tisane: sono allergeni.",
      "Una tisana non è un integratore: evita in carta indicazioni salutistiche, sono vietate senza claim autorizzati.",
      "Se hai pochi piatti o nessuno, togli le categorie che non usi: un menu con sezioni vuote sembra incompleto.",
    ],
  },
  {
    tipo: "bar",
    nome: "Bar e caffetteria",
    descrizione: "Caffetteria, colazione, aperitivo.",
    categorie: [
      { nome: "Caffetteria", reparto: "bar", genere: "drink", fuoriFormula: true },
      { nome: "Colazione", reparto: "bar", fuoriFormula: true },
      // L'aperitivo lo fa il banco, non la cucina: se finisce in cucina, chi
      // sta al bancone non può nemmeno segnarlo pronto.
      { nome: "Aperitivo", reparto: "bar", iva: 22, genere: "drink", fuoriFormula: true },
      { nome: "Panini e toast" },
      { nome: "Bevande", reparto: "bar", genere: "drink", fuoriFormula: true },
      { nome: "Vini", reparto: "bar", iva: 22, genere: "wine", fuoriFormula: true },
    ],
    gruppi: [
      {
        nome: "Latte",
        categorie: ["Caffetteria"],
        tipo: "scelta",
        obbligatorio: false,
        multiplo: false,
        opzioni: [
          ["Intero", 0],
          ["Scremato", 0],
          ["Soia", 50],
          ["Avena", 50],
          ["Senza lattosio", 50],
        ],
      },
      {
        nome: "Caffè",
        categorie: ["Caffetteria"],
        tipo: "scelta",
        obbligatorio: false,
        multiplo: false,
        opzioni: [
          ["Normale", 0],
          ["Ristretto", 0],
          ["Lungo", 0],
          ["Decaffeinato", 0],
          ["In tazza grande", 0],
        ],
      },
    ],
    promemoria: [
      "Il prezzo al banco e al tavolo può differire: se lo fai, va esposto.",
      "Latte e frutta a guscio sono allergeni: valgono anche per la caffetteria.",
    ],
  },
];

export function modelloPerTipo(tipo: string): ModelloLocale | undefined {
  return MODELLI.find((m) => m.tipo === tipo);
}

/**
 * Come si legge una scelta nella comanda.
 *
 * Una rimozione stampata come "Cipolla" direbbe al cuoco di aggiungerla:
 * è l'errore che rende inutile tutta la funzione.
 */
export function etichettaScelta(tipo: TipoGruppo, nome: string): string {
  return tipo === "rimozione" ? `Senza ${nome.toLowerCase()}` : nome;
}
