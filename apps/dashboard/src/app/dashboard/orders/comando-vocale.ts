/**
 * Riconoscimento vocale per la cucina.
 *
 * In cucina le mani sono occupate o sporche: dire "tavolo tre pronto" vale
 * sei tocchi su uno schermo che nessuno vuole toccare con le mani unte.
 *
 * Usa l'API del browser, non un servizio nostro. Va detto con chiarezza a
 * chi la accende: su Chrome l'audio viene inviato ai server di Google per
 * essere trascritto. Per questo è spenta di default e si attiva a mano —
 * non è una cosa da far partire di nascosto in un luogo di lavoro dove si
 * parla tutto il giorno.
 */

export type Azione =
  | { tipo: "avanza"; tavolo: string; a: "preparing" | "ready" | "served" }
  | { tipo: "trattieni"; tavolo: string; trattieni: boolean }
  | { tipo: "sconosciuto"; testo: string };

/**
 * I numeri detti a voce arrivano scritti in lettere.
 *
 * Le due lingue stanno nella stessa tabella invece che in due: in cucina si
 * parla come capita, e un cuoco che lavora in inglese dice comunque "tavolo"
 * quando lo dice al collega italiano. Separarle avrebbe significato non
 * capire proprio le frasi miste, che sono la maggioranza.
 */
const NUMERI: Record<string, string> = {
  uno: "1", due: "2", tre: "3", quattro: "4", cinque: "5",
  sei: "6", sette: "7", otto: "8", nove: "9", dieci: "10",
  undici: "11", dodici: "12", tredici: "13", quattordici: "14",
  quindici: "15", sedici: "16", diciassette: "17", diciotto: "18",
  diciannove: "19", venti: "20",
  one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  eleven: "11", twelve: "12", thirteen: "13", fourteen: "14",
  fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18",
  nineteen: "19", twenty: "20",
};

/**
 * Interpreta una frase in azione.
 *
 * Deliberatamente permissivo sull'ordine delle parole: in cucina si dice
 * "tavolo 3 pronto" tanto quanto "pronto il tre". Il codice del tavolo può
 * avere una lettera davanti (T3), che chi parla non pronuncia mai.
 */
export function interpreta(testo: string): Azione {
  const t = testo.toLowerCase().trim();

  let numero: string | null = null;

  const cifra = t.match(/\b(?:tavolo|table\s*)?\s*t?\s*(\d{1,2})\b/);
  if (cifra) numero = cifra[1];

  if (!numero) {
    for (const [parola, valore] of Object.entries(NUMERI)) {
      if (new RegExp(`\\b${parola}\\b`).test(t)) {
        numero = valore;
        break;
      }
    }
  }

  if (!numero) return { tipo: "sconosciuto", testo };

  // Trattenere prima di tutto: "ritarda il tre" e "manda il tre" contengono
  // spesso anche la parola del piatto o della portata, e finirebbero
  // interpretate come un avanzamento.
  if (/\britard|\btratt|\baspett|\bferma|\bhold|\bwait|\bdelay/.test(t)) {
    return { tipo: "trattieni", tavolo: numero, trattieni: true };
  }
  if (/\bmanda|\blibera|\bvai col|\bfai partire|\bsend|\brelease|\bgo ahead/.test(t)) {
    return { tipo: "trattieni", tavolo: numero, trattieni: false };
  }

  // "servito" prima di "pronto": chi dice "servito" ha già superato pronto,
  // e la parola "pronto" può comparire in entrambe le frasi.
  if (/\bserv|\bdelivered|\bon the table/.test(t)) {
    return { tipo: "avanza", tavolo: numero, a: "served" };
  }
  if (/\bpront|\bready|\bup\b|\bplated/.test(t)) {
    return { tipo: "avanza", tavolo: numero, a: "ready" };
  }
  if (/\bprepar|\bin lavoraz|\bpartito|\bworking|\bfiring|\bstarted/.test(t)) {
    return { tipo: "avanza", tavolo: numero, a: "preparing" };
  }

  return { tipo: "sconosciuto", testo };
}

interface RiconoscimentoEventoRisultato {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
  resultIndex: number;
}

export interface Riconoscimento {
  start(): void;
  stop(): void;
  abort(): void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RiconoscimentoEventoRisultato) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type Costruttore = new () => Riconoscimento;

/**
 * null se il browser non sa fare riconoscimento vocale (Firefox, per ora).
 *
 * La lingua è quella dell'interfaccia e non una costante: un cuoco che lavora
 * in inglese detta "table five ready", e un riconoscitore impostato
 * sull'italiano gli restituisce una trascrizione che nessuna delle frasi
 * riconosciute può soddisfare — il comando fallisce sempre e sembra rotto.
 */
export function creaRiconoscimento(lingua: "it" | "en" = "it"): Riconoscimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: Costruttore;
    webkitSpeechRecognition?: Costruttore;
  };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!C) return null;

  const r = new C();
  r.lang = lingua === "en" ? "en-GB" : "it-IT";
  r.continuous = true;
  // I risultati parziali cambiano mentre si parla: agire su quelli
  // significherebbe segnare un tavolo sbagliato a metà frase.
  r.interimResults = false;
  return r;
}
