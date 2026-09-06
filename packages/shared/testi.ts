/**
 * I testi fissi delle pagine pubbliche, riscrivibili dal locale.
 *
 * Erano stringhe nel codice, uguali per ogni cliente: una trattoria e una
 * gintoneria si presentavano con la stessa identica frase. Qui diventano
 * campi, con il nostro testo come ripiego — chi non tocca niente non vede
 * cambiare niente.
 *
 * `{nome}` viene sostituito col nome del locale, così il titolo resta
 * corretto anche se il locale cambia ragione sociale.
 */

export interface SlotTesto {
  chiave: string;
  etichetta: string;
  /** Dove compare, detto in modo che si capisca senza aprire la pagina. */
  dove: string;
  predefinito: string;
  /**
   * Lo stesso ripiego in inglese.
   *
   * Solo il ripiego: quando il locale scrive il suo testo, quello vale in
   * tutte le lingue. Non lo traduciamo noi e non lo facciamo tradurre a una
   * macchina — è la voce del ristoratore, e una traduzione automatica della
   * sua presentazione è peggio della sua presentazione in italiano.
   */
  predefinitoEn: string;
  /** Testi lunghi vanno su più righe. */
  lungo?: boolean;
}

export const TESTI_PUBBLICI: SlotTesto[] = [
  {
    chiave: "prenota_titolo",
    etichetta: "Titolo della pagina prenotazioni",
    dove: "In cima alla pagina che mandi ai clienti per prenotare.",
    predefinito: "Prenota da {nome}",
    predefinitoEn: "Book a table at {nome}",
  },
  {
    chiave: "prenota_benvenuto",
    etichetta: "Presentazione sotto il titolo",
    dove: "Poche righe su chi siete. Vuoto: non compare niente.",
    predefinito: "",
    predefinitoEn: "",
    lungo: true,
  },
  {
    chiave: "prenota_chiuse_titolo",
    etichetta: "Quando le prenotazioni online sono spente",
    dove: "Sostituisce il modulo di prenotazione.",
    predefinito: "Prenotazione online non disponibile",
    predefinitoEn: "Online booking unavailable",
  },
  {
    chiave: "prenota_chiuse_testo",
    etichetta: "Cosa deve fare il cliente allora",
    dove: "Sotto il messaggio qui sopra.",
    predefinito: "Contatta direttamente il locale per prenotare un tavolo.",
    predefinitoEn: "Please contact the restaurant directly to book a table.",
    lungo: true,
  },
  {
    chiave: "prenota_telefono",
    etichetta: "Invito a telefonare",
    dove: "In fondo alla pagina prenotazioni, prima del numero.",
    predefinito: "Preferisci telefonare?",
    predefinitoEn: "Would you rather call?",
  },
  {
    chiave: "prenota_link_menu",
    etichetta: "Link al menu",
    dove: "In fondo alla pagina prenotazioni.",
    predefinito: "Guarda il menu",
    predefinitoEn: "See the menu",
  },
  {
    chiave: "menu_nota",
    etichetta: "Nota in fondo alla carta",
    dove: "Ultima riga del menu digitale.",
    predefinito: "Menu e prezzi aggiornati dal locale.",
    predefinitoEn: "Menu and prices are kept up to date by the restaurant.",
    lungo: true,
  },
  {
    chiave: "menu_contatti",
    etichetta: "Contatti sul menu",
    dove: "Compare solo se non hai messo telefono e email pubblici.",
    predefinito: "Contatti disponibili presso il locale.",
    predefinitoEn: "Contact details available at the restaurant.",
  },
];

export type TestiPubblici = Record<string, string>;

/**
 * Risolve uno slot: testo del locale se c'è e non è vuoto, altrimenti il
 * nostro. Uno spazio bianco vale come vuoto, perché è come si cancella un
 * campo senza accorgersene.
 */
export function testo(
  testi: TestiPubblici | null | undefined,
  chiave: string,
  sostituzioni: Record<string, string> = {}
): string {
  return testoTradotto(testi, chiave, "it", sostituzioni);
}

/**
 * Lo stesso, nella lingua di chi legge.
 *
 * La regola sta tutta nell'ordine: il testo del locale batte il ripiego in
 * qualunque lingua. Se il ristoratore ha scritto la sua presentazione in
 * italiano, un inglese la legge in italiano — ed è giusto così, perché
 * quella è la sua voce e nessuno ci ha chiesto di riscriverla. Il ripiego,
 * invece, è nostro, e il nostro lo traduciamo.
 */
export function testoTradotto(
  testi: TestiPubblici | null | undefined,
  chiave: string,
  lingua: "it" | "en",
  sostituzioni: Record<string, string> = {}
): string {
  const slot = TESTI_PUBBLICI.find((s) => s.chiave === chiave);
  const ripiego = (lingua === "en" ? slot?.predefinitoEn : slot?.predefinito) ?? "";
  const scelto = (testi?.[chiave] ?? "").trim() || ripiego;
  return Object.entries(sostituzioni).reduce(
    (acc, [k, v]) => acc.split(`{${k}}`).join(v),
    scelto
  );
}

/** Ripulisce quello che arriva dal form prima di salvarlo. */
export function normalizzaTesti(grezzi: Record<string, unknown>): TestiPubblici {
  const out: TestiPubblici = {};
  for (const slot of TESTI_PUBBLICI) {
    // I textarea mandano CRLF: normalizzare qui evita di portarsi dietro
    // ritorni carrello fino all'email e al JSON-LD.
    const v = String(grezzi[slot.chiave] ?? "")
      .replace(/\r\n?/g, "\n")
      .trim();
    // Un campo lasciato uguale al predefinito non va salvato: così se un
    // domani miglioriamo la frase, chi non l'ha personalizzata la riceve.
    // Né l'italiano né l'inglese: chi incolla il ripiego inglese nel campo
    // lo sta lasciando com'è, non lo sta personalizzando.
    if (v && v !== slot.predefinito && v !== slot.predefinitoEn) {
      out[slot.chiave] = v.slice(0, 600);
    }
  }
  return out;
}
