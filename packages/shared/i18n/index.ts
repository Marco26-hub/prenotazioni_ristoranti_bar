/**
 * L'interfaccia in italiano e in inglese.
 *
 * Da non confondere con `lingue.ts`, che traduce il *contenuto*: i nomi dei
 * piatti, scritti dal ristoratore, in dieci lingue. Qui si traduce il
 * *software* — pulsanti, errori, etichette. Sono due cose separate perché
 * cambiano per ragioni diverse e le scrive gente diversa: il menu lo traduce
 * il locale, l'interfaccia la traduciamo noi.
 *
 * Due lingue e non dieci. Un nome di piatto tradotto male fa sorridere; un
 * pulsante tradotto male fa sbagliare un pagamento. Meglio due lingue curate
 * che dieci approssimative — e l'inglese copre il turista che non parla
 * italiano, che è il caso vero.
 */

export type LinguaUI = "it" | "en";

export const LINGUE_UI: readonly LinguaUI[] = ["it", "en"];

export const LINGUA_UI_BASE: LinguaUI = "it";

/** Come la chiama chi la parla: in un selettore è quello che si cerca. */
export const NOME_LINGUA_UI: Record<LinguaUI, string> = {
  it: "Italiano",
  en: "English",
};

/**
 * La locale per i formattatori.
 *
 * `en-GB` e non `en-US`: il locale è in Italia. Giorno prima del mese e
 * orologio a 24 ore, come sul resto della pagina e come sulla prenotazione
 * che il cliente ha in mano. Un menu che dice "7:30 PM" accanto a un cartello
 * che dice "19:30" è un menu che confonde.
 */
const LOCALE: Record<LinguaUI, string> = {
  it: "it-IT",
  en: "en-GB",
};

export function normalizzaLinguaUI(v: string | null | undefined): LinguaUI | null {
  if (!v) return null;
  const c = v.trim().slice(0, 2).toLowerCase();
  return (LINGUE_UI as readonly string[]).includes(c) ? (c as LinguaUI) : null;
}

/**
 * Che lingua parla chi ha aperto la pagina.
 *
 * L'ordine è di precedenza decrescente e non è arbitrario: una scelta
 * esplicita (il link `?lang=`) batte una scelta ricordata (il cookie), che
 * batte una preferenza del browser, che batte l'italiano. Chi tocca il
 * selettore vuole quella lingua adesso, anche se il telefono dice altro.
 */
export function scegliLinguaUI(
  richiesta: string | null | undefined,
  cookie: string | null | undefined,
  acceptLanguage: string | null | undefined,
  predefinita: LinguaUI = LINGUA_UI_BASE
): LinguaUI {
  const esplicita = normalizzaLinguaUI(richiesta);
  if (esplicita) return esplicita;

  const ricordata = normalizzaLinguaUI(cookie);
  if (ricordata) return ricordata;

  if (acceptLanguage) {
    // "en-GB,en;q=0.9,it;q=0.8" → en, en, it. I pesi sono già in ordine.
    for (const parte of acceptLanguage.split(",")) {
      const l = normalizzaLinguaUI(parte.split(";")[0]);
      if (l) return l;
    }
  }

  return predefinita;
}

/** Il nome del cookie che ricorda la scelta, uguale ovunque. */
export const COOKIE_LINGUA = "lingua_ui";

export type Voci = Record<string, string>;

/**
 * L'inglese deve avere esattamente le chiavi dell'italiano.
 *
 * È un tipo e non un controllo a runtime di proposito: una chiave inglese
 * dimenticata deve rompere la compilazione, non comparire in italiano in
 * mezzo a una frase inglese davanti al cliente.
 */
export type Speculare<D extends Voci> = { [K in keyof D]: string };

export type Valori = Record<string, string | number>;

export interface Traduttore<D extends Voci = Voci> {
  (chiave: Extract<keyof D, string>, valori?: Valori): string;
  /** La lingua attiva, per chi deve passarla oltre o metterla in un `lang=`. */
  lingua: LinguaUI;
  /** Plurale: cerca `chiave.zero`, `chiave.uno`, `chiave.molti`. `{n}` è già dentro. */
  n(conteggio: number, chiave: string, valori?: Valori): string;
  prezzo(cents: number, valuta?: string): string;
  numero(v: number, decimali?: number): string;
  data(d: Date, stile?: "corta" | "media" | "lunga"): string;
  ora(d: Date): string;
  dataOra(d: Date): string;
  elenco(voci: string[]): string;
}

const SEGNAPOSTO = /\{(\w+)\}/g;

function riempi(testo: string, valori?: Valori): string {
  if (!valori) return testo;
  return testo.replace(SEGNAPOSTO, (intero, chiave: string) => {
    const v = valori[chiave];
    return v === undefined || v === null ? intero : String(v);
  });
}

/**
 * Costruisce il traduttore di un dizionario.
 *
 * Il ripiego è l'italiano, non la chiave: se per qualunque motivo una voce
 * inglese manca a runtime — un dizionario caricato male, un deploy a metà —
 * il cliente legge una parola italiana e capisce lo stesso. Vedere
 * `carrello.svuota` scritto su un pulsante è molto peggio.
 */
export function dizionario<D extends Voci>(it: D, en: Speculare<D>) {
  const tabelle: Record<LinguaUI, Voci> = { it, en };

  return function per(lingua: LinguaUI): Traduttore<D> {
    const tabella = tabelle[lingua] ?? it;
    const loc = LOCALE[lingua] ?? LOCALE.it;

    const t = ((chiave: Extract<keyof D, string>, valori?: Valori) => {
      const grezzo = tabella[chiave] ?? it[chiave];
      if (grezzo === undefined) {
        // Non lanciare: una chiave sbagliata non deve far fallire una pagina
        // che per il resto funziona. In sviluppo si vede subito, in
        // produzione si legge male una riga invece di perdere il servizio.
        if (process.env.NODE_ENV !== "production") {
          console.warn(`i18n: chiave assente "${chiave}"`);
        }
        return chiave;
      }
      return riempi(grezzo, valori);
    }) as Traduttore<D>;

    t.lingua = lingua;

    t.n = (conteggio, chiave, valori) => {
      const scelta =
        conteggio === 0 && (tabella[`${chiave}.zero`] ?? it[`${chiave}.zero`])
          ? `${chiave}.zero`
          : conteggio === 1
            ? `${chiave}.uno`
            : `${chiave}.molti`;
      return t(scelta as Extract<keyof D, string>, { n: conteggio, ...valori });
    };

    t.prezzo = (cents, valuta = "EUR") =>
      new Intl.NumberFormat(loc, { style: "currency", currency: valuta }).format(cents / 100);

    t.numero = (v, decimali) =>
      new Intl.NumberFormat(loc, {
        minimumFractionDigits: decimali,
        maximumFractionDigits: decimali,
      }).format(v);

    t.data = (d, stile = "media") =>
      new Intl.DateTimeFormat(loc, {
        dateStyle: stile === "corta" ? "short" : stile === "lunga" ? "long" : "medium",
      }).format(d);

    t.ora = (d) =>
      new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

    t.dataOra = (d) =>
      new Intl.DateTimeFormat(loc, {
        dateStyle: "medium",
        timeStyle: "short",
        hour12: false,
      }).format(d);

    t.elenco = (voci) =>
      new Intl.ListFormat(loc, { style: "long", type: "conjunction" }).format(voci);

    return t;
  };
}

/**
 * Quale traduzione del *contenuto* mostrare, data la lingua dell'interfaccia.
 *
 * Il ponte fra i due sistemi. Se l'interfaccia è in inglese e il locale ha
 * tradotto il menu in inglese, i piatti vanno in inglese: un cliente che
 * legge "Checkout" e poi "Tagliata di manzo" ha metà pagina che non capisce.
 * Se il locale non ha tradotto niente, resta l'italiano — è quello che il
 * ristoratore ha scritto, ed è meglio del nulla.
 */
export function linguaContenuto(ui: LinguaUI, disponibili: string[]): string {
  if (ui === "it") return "it";
  return disponibili.includes(ui) ? ui : "it";
}

/**
 * L'interfaccia da mostrare a chi ha chiesto il menu in una lingua qualunque.
 *
 * Il selettore del menu offre dieci lingue perché il *contenuto* può averle;
 * l'interfaccia ne ha due. Chi chiede il menu in tedesco non vuole i pulsanti
 * in italiano: vuole la lingua che capisce di più fra quelle che abbiamo.
 * Quindi tutto ciò che non è italiano cade sull'inglese, che è la lingua che
 * un turista in Italia legge comunque.
 */
export function linguaUIPerContenuto(codiceContenuto: string | null | undefined): LinguaUI {
  if (!codiceContenuto) return LINGUA_UI_BASE;
  const c = codiceContenuto.trim().slice(0, 2).toLowerCase();
  if (c === "it") return "it";
  return "en";
}
