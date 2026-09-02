import "server-only";

/**
 * Lettura di un'etichetta o di una scheda tecnica tramite OpenRouter.
 *
 * Serve a compilare la scheda di un vino da una foto invece che a mano: un
 * sommelier che fotografa duecento etichette impiega un pomeriggio, se le
 * batte a tastiera ne impiega tre.
 *
 * Quello che torna è una *proposta*, mai un dato salvato. Ciò che finisce
 * in carta è un'affermazione commerciale e in parte legale: un'annata o una
 * denominazione inventate dal modello diventerebbero informazione falsa
 * davanti al cliente. Conferma sempre una persona.
 */

export type { SchedaVino } from "./openrouter-tipi";
export { MODELLO_PREDEFINITO } from "./openrouter-tipi";

import type { SchedaVino } from "./openrouter-tipi";
import { MODELLO_PREDEFINITO } from "./openrouter-tipi";

export interface EsitoLettura {
  scheda?: SchedaVino;
  errore?: string;
}

const ISTRUZIONI = `Sei un sommelier che cataloga una carta dei vini.
Ti viene data la foto di un'etichetta o di una scheda tecnica.

Rispondi SOLO con un oggetto JSON, senza testo attorno e senza blocchi di
codice, con queste chiavi (ometti quelle che non riesci a leggere):
- name: nome del vino come compare in etichetta
- producer: cantina
- vintage: annata, numero intero
- denomination: DOCG, DOC, IGT, DOP, IGP o simile
- origin: zona e regione
- abv: gradazione alcolica, numero
- ingredients: vitigni, se indicati
- description: una riga sobria sul profilo, massimo 25 parole
- allergens: array; includi "solfiti" se l'etichetta riporta la dicitura
- incerti: array dei campi che NON hai potuto leggere con certezza

Regole tassative:
- Non dedurre e non inventare nulla che non sia leggibile nell'immagine.
  Un'annata sbagliata su una carta dei vini è un dato falso al cliente.
- Se un campo è illeggibile, omettilo e mettilo in "incerti".
- Se l'immagine non è un'etichetta o una scheda di vino, rispondi
  {"incerti":["immagine non riconosciuta"]}.`;

/**
 * Interroga il modello e restituisce la scheda proposta.
 *
 * Nessun lancio di eccezioni: il caricamento di un menu non deve
 * interrompersi perché un servizio esterno è lento o ha cambiato listino.
 */
export async function leggiEtichetta(
  immagineDataUrl: string,
  apiKey: string,
  modello: string
): Promise<EsitoLettura> {
  if (!apiKey) return { errore: "Chiave OpenRouter non configurata" };

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modello || MODELLO_PREDEFINITO,
        // Temperatura bassa: qui non serve fantasia, serve trascrizione.
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: ISTRUZIONI },
              { type: "image_url", image_url: { url: immagineDataUrl } },
            ],
          },
        ],
      }),
      // Un'etichetta illeggibile può far ragionare a lungo il modello: oltre
      // questo tempo si dice all'operatore di compilare a mano.
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      return { errore: `OpenRouter ${res.status}: ${corpo.slice(0, 200)}` };
    }

    const dati = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const testo = dati.choices?.[0]?.message?.content;
    if (!testo) return { errore: "Il modello non ha restituito nulla" };

    return { scheda: interpreta(testo) };
  } catch (e) {
    return {
      errore:
        e instanceof Error && e.name === "TimeoutError"
          ? "Il modello ha impiegato troppo: compila a mano"
          : e instanceof Error
            ? e.message
            : "Errore di rete verso OpenRouter",
    };
  }
}

/**
 * Estrae il JSON dalla risposta.
 *
 * I modelli aggiungono spesso una frase o un blocco di codice attorno
 * all'oggetto anche quando gli si chiede di non farlo: si cerca il primo
 * oggetto invece di sperare in una risposta pulita.
 */
function interpreta(testo: string): SchedaVino {
  const inizio = testo.indexOf("{");
  const fine = testo.lastIndexOf("}");
  if (inizio === -1 || fine <= inizio) return { incerti: ["risposta non interpretabile"] };

  let grezzo: Record<string, unknown>;
  try {
    grezzo = JSON.parse(testo.slice(inizio, fine + 1)) as Record<string, unknown>;
  } catch {
    return { incerti: ["risposta non interpretabile"] };
  }

  const stringa = (k: string, max = 300) => {
    const v = grezzo[k];
    return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
  };

  // Ogni numero viene ricontrollato qui: un'annata 3024 o una gradazione a
  // 130 gradi sono un errore del modello, e finirebbero in carta.
  const numero = (k: string, min: number, max: number) => {
    const v = Number(grezzo[k]);
    return Number.isFinite(v) && v >= min && v <= max ? v : undefined;
  };

  const lista = (k: string) => {
    const v = grezzo[k];
    if (!Array.isArray(v)) return undefined;
    const pulita = v
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim().slice(0, 60))
      .slice(0, 20);
    return pulita.length > 0 ? pulita : undefined;
  };

  return {
    name: stringa("name", 120),
    producer: stringa("producer", 120),
    vintage: numero("vintage", 1900, new Date().getFullYear() + 1),
    denomination: stringa("denomination", 60),
    origin: stringa("origin", 120),
    abv: numero("abv", 0, 30),
    ingredients: stringa("ingredients", 300),
    description: stringa("description", 300),
    allergens: lista("allergens"),
    incerti: lista("incerti"),
  };
}
