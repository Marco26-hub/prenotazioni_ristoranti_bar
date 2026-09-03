import "server-only";
import { MODELLO_PREDEFINITO } from "./openrouter-tipi";

/**
 * Lettura di una piantina di sala.
 *
 * Il locale carica la pianta che ha già — quella del geometra, quella della
 * SCIA, quella disegnata a mano — e i tavoli vengono riconosciuti invece che
 * piazzati a mano uno per uno. Una sala da quaranta tavoli disposta a mano è
 * mezz'ora di lavoro; qui diventa una conferma.
 *
 * Le proposte non vengono mai applicate da sole: un tavolo creato per errore
 * finisce sui QR e nel conto, quindi passa sempre dalla conferma di chi
 * guarda la pianta e sa se quel rettangolo è un tavolo o una colonna.
 */

export interface TavoloRiconosciuto {
  /** Etichetta letta sulla pianta, o generata se assente. */
  codice: string;
  posti: number;
  forma: "rettangolo" | "tondo" | "bancone";
  /** Frazioni 0–1 del lato della pianta: indipendenti dalla risoluzione. */
  x: number;
  y: number;
}

export interface EsitoPiantina {
  tavoli?: TavoloRiconosciuto[];
  avviso?: string;
  errore?: string;
}

const ISTRUZIONI = `Guarda questa piantina di un locale di ristorazione e
individua i TAVOLI dei clienti.

Rispondi SOLO con JSON valido, senza commenti e senza blocchi markdown:
{"tavoli":[{"codice":"T1","posti":4,"forma":"rettangolo","x":0.12,"y":0.34}],
 "avviso":"eventuale dubbio in una frase, oppure stringa vuota"}

Regole:
- x e y sono il CENTRO del tavolo espressi come frazione della larghezza e
  dell'altezza dell'immagine, fra 0 e 1. x=0 è il bordo sinistro, y=0 il bordo
  superiore.
- codice: usa l'etichetta scritta sulla pianta se c'è (T1, 12, Tav. 5, A3).
  Se non c'è nessuna etichetta scrivi la stringa vuota.
- posti: quante sedie vedi attorno al tavolo. Se non si contano, stima dalla
  dimensione: piccolo 2, medio 4, grande 6, molto grande 8.
- forma: "tondo" se il tavolo è circolare, "bancone" se è un banco lungo e
  stretto o il bancone del bar, altrimenti "rettangolo".

NON includere: muri, porte, finestre, bagni, cucina, magazzino, scale,
colonne, piante, arredi che non siano tavoli per i clienti.

Se la pianta non è la mappa di un locale, oppure non riesci a distinguere i
tavoli, rispondi {"tavoli":[],"avviso":"spiega in una frase perché"}.`;

function numero(v: unknown, min: number, max: number, ripiego: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return ripiego;
  return Math.min(max, Math.max(min, n));
}

function interpreta(testo: string): EsitoPiantina {
  // I modelli incorniciano volentieri il JSON in un blocco markdown, anche
  // quando gli si dice di non farlo.
  const pulito = testo
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let dati: { tavoli?: unknown; avviso?: unknown };
  try {
    dati = JSON.parse(pulito) as typeof dati;
  } catch {
    const m = pulito.match(/\{[\s\S]*\}/);
    if (!m) return { errore: "Il modello non ha risposto in JSON" };
    try {
      dati = JSON.parse(m[0]) as typeof dati;
    } catch {
      return { errore: "Il modello non ha risposto in JSON" };
    }
  }

  const grezzi = Array.isArray(dati.tavoli) ? dati.tavoli : [];
  const forme = new Set(["rettangolo", "tondo", "bancone"]);

  const tavoli: TavoloRiconosciuto[] = grezzi
    .slice(0, 120)
    .map((t) => {
      const r = (t ?? {}) as Record<string, unknown>;
      const forma = String(r.forma ?? "rettangolo");
      return {
        codice: String(r.codice ?? "").trim().slice(0, 20),
        posti: Math.round(numero(r.posti, 1, 40, 4)),
        forma: (forme.has(forma) ? forma : "rettangolo") as TavoloRiconosciuto["forma"],
        x: numero(r.x, 0, 1, 0.5),
        y: numero(r.y, 0, 1, 0.5),
      };
    })
    // Un tavolo senza posizione utile non serve a niente: meglio ometterlo
    // che metterlo nell'angolo e far credere che la pianta sia sbagliata.
    .filter((t) => Number.isFinite(t.x) && Number.isFinite(t.y));

  const avviso = typeof dati.avviso === "string" ? dati.avviso.trim() : "";
  return { tavoli, avviso: avviso || undefined };
}

export async function leggiPiantina(
  immagineDataUrl: string,
  apiKey: string,
  modello: string
): Promise<EsitoPiantina> {
  if (!apiKey) return { errore: "Chiave OpenRouter non configurata" };

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modello || MODELLO_PREDEFINITO,
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
      // Una pianta densa richiede più lavoro di un'etichetta di vino: qui il
      // modello deve contare sedie e leggere numeri piccoli.
      signal: AbortSignal.timeout(90_000),
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

    return interpreta(testo);
  } catch (e) {
    return {
      errore:
        e instanceof Error && e.name === "TimeoutError"
          ? "La lettura ha impiegato troppo. Disponi i tavoli a mano."
          : e instanceof Error
            ? e.message
            : "Errore di rete verso OpenRouter",
    };
  }
}
