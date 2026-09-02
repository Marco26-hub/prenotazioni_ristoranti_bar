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
  | { tipo: "sconosciuto"; testo: string };

/** I numeri detti a voce arrivano scritti in lettere. */
const NUMERI: Record<string, string> = {
  uno: "1", due: "2", tre: "3", quattro: "4", cinque: "5",
  sei: "6", sette: "7", otto: "8", nove: "9", dieci: "10",
  undici: "11", dodici: "12", tredici: "13", quattordici: "14",
  quindici: "15", sedici: "16", diciassette: "17", diciotto: "18",
  diciannove: "19", venti: "20",
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

  const cifra = t.match(/\b(?:tavolo\s*)?t?\s*(\d{1,2})\b/);
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

  // "servito" prima di "pronto": chi dice "servito" ha già superato pronto,
  // e la parola "pronto" può comparire in entrambe le frasi.
  if (/\bserv/.test(t)) return { tipo: "avanza", tavolo: numero, a: "served" };
  if (/\bpront/.test(t)) return { tipo: "avanza", tavolo: numero, a: "ready" };
  if (/\bprepar|\bin lavoraz|\bpartito/.test(t)) {
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

/** null se il browser non sa fare riconoscimento vocale (Firefox, per ora). */
export function creaRiconoscimento(): Riconoscimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: Costruttore;
    webkitSpeechRecognition?: Costruttore;
  };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!C) return null;

  const r = new C();
  r.lang = "it-IT";
  r.continuous = true;
  // I risultati parziali cambiano mentre si parla: agire su quelli
  // significherebbe segnare un tavolo sbagliato a metà frase.
  r.interimResults = false;
  return r;
}
