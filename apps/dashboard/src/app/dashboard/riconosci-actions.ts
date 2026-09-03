"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { decryptSecret } from "@repo/shared/crypto";
import { leggiPiantina } from "@repo/shared/piantina";
import { requireRole } from "@/lib/authz";
import { COLONNE, RIGHE } from "./sala-griglia";

export interface Proposta {
  codice: string;
  posti: number;
  forma: string;
  x: number;
  y: number;
  /** Esiste già un tavolo con questo codice: va spostato, non creato. */
  esistente: boolean;
}

export interface EsitoRiconoscimento {
  proposte?: Proposta[];
  avviso?: string;
  errore?: string;
}

/**
 * Legge la piantina già caricata e propone dove stanno i tavoli.
 *
 * Propone e basta: applicare da solo significherebbe creare tavoli veri, con
 * il loro QR e il loro conto, sulla parola di un modello che potrebbe aver
 * scambiato una colonna per un tondo da due.
 */
export async function riconosciTavoli(): Promise<EsitoRiconoscimento> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();

  const [locale] = await sql<
    {
      floor_plan_url: string | null;
      openrouter_api_key: string | null;
      openrouter_model: string | null;
    }[]
  >`select floor_plan_url, openrouter_api_key, openrouter_model
      from venues where id = ${venue.venueId}`;

  if (!locale?.floor_plan_url) {
    return { errore: "Carica prima la piantina della sala." };
  }
  if (!locale.openrouter_api_key) {
    return {
      errore:
        "Il riconoscimento usa l'AI: configura la chiave OpenRouter in Impostazioni.",
    };
  }

  // Un SVG non è un'immagine per un modello di visione: va rasterizzato, e
  // qui non abbiamo un motore di rendering.
  if (locale.floor_plan_url.startsWith("data:image/svg")) {
    return {
      errore:
        "Il riconoscimento non legge gli SVG. Ricarica la pianta come PDF, PNG o JPG.",
    };
  }

  let chiave: string;
  try {
    chiave = decryptSecret(locale.openrouter_api_key);
  } catch {
    return { errore: "Chiave OpenRouter illeggibile: reinseriscila." };
  }

  const esito = await leggiPiantina(
    locale.floor_plan_url,
    chiave,
    locale.openrouter_model ?? ""
  );
  if (esito.errore) return { errore: esito.errore };

  const esistenti = await sql<{ code: string }[]>`
    select code from tables where venue_id = ${venue.venueId}`;
  const codici = new Set(esistenti.map((t) => t.code.toLowerCase()));

  const usati = new Set<string>();
  let progressivo = 1;

  const proposte: Proposta[] = (esito.tavoli ?? []).map((t) => {
    // Senza etichetta sulla pianta serve un nome comunque, e non deve
    // scontrarsi con quelli già a menu.
    let codice = t.codice;
    if (!codice) {
      do {
        codice = `T${progressivo++}`;
      } while (codici.has(codice.toLowerCase()) || usati.has(codice.toLowerCase()));
    }
    usati.add(codice.toLowerCase());

    return {
      codice,
      posti: t.posti,
      forma: t.forma,
      // Le frazioni diventano celle della griglia su cui si dispone la sala.
      x: Math.min(COLONNE - 1, Math.max(0, Math.round(t.x * (COLONNE - 1)))),
      y: Math.min(RIGHE - 1, Math.max(0, Math.round(t.y * (RIGHE - 1)))),
      esistente: codici.has(codice.toLowerCase()),
    };
  });

  if (proposte.length === 0) {
    return {
      avviso:
        esito.avviso ?? "Non ho riconosciuto tavoli in questa pianta.",
      proposte: [],
    };
  }

  return { proposte, avviso: esito.avviso };
}

/**
 * Applica le proposte confermate.
 *
 * I codici già esistenti vengono spostati e non duplicati: rifare il
 * riconoscimento due volte non deve raddoppiare la sala.
 */
export async function applicaProposte(
  proposte: Proposta[]
): Promise<{ ok?: string; error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);

  if (!Array.isArray(proposte) || proposte.length === 0) {
    return { error: "Niente da applicare" };
  }
  if (proposte.length > 120) return { error: "Troppi tavoli in una volta" };

  const forme = new Set(["rettangolo", "tondo", "bancone"]);
  const pulite = proposte
    .map((p) => ({
      codice: String(p.codice ?? "").trim().slice(0, 20),
      posti: Math.min(40, Math.max(1, Math.round(Number(p.posti) || 4))),
      forma: forme.has(String(p.forma)) ? String(p.forma) : "rettangolo",
      x: Math.min(COLONNE - 1, Math.max(0, Math.round(Number(p.x) || 0))),
      y: Math.min(RIGHE - 1, Math.max(0, Math.round(Number(p.y) || 0))),
    }))
    .filter((p) => p.codice);

  if (pulite.length === 0) return { error: "Nessun tavolo valido" };

  let creati = 0;
  let spostati = 0;

  const sql = db();
  await sql.begin(async (tx) => {
    for (const p of pulite) {
      // Un unico statement invece di select-poi-scrivi: fra le due query un
      // altro addetto potrebbe creare lo stesso tavolo, e il vincolo di
      // unicità farebbe fallire tutta la transazione.
      const [row] = await tx<{ inserito: boolean }[]>`
        insert into tables (venue_id, code, seats, shape, pos_x, pos_y)
        values (${venue.venueId}, ${p.codice}, ${p.posti}, ${p.forma}, ${p.x}, ${p.y})
        on conflict (venue_id, code) do update
           set pos_x = excluded.pos_x,
               pos_y = excluded.pos_y,
               seats = excluded.seats,
               shape = excluded.shape
        returning (xmax = 0) as inserito`;
      if (row?.inserito) creati += 1;
      else spostati += 1;
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tables");

  const parti: string[] = [];
  if (creati) parti.push(`${creati} ${creati === 1 ? "tavolo creato" : "tavoli creati"}`);
  if (spostati) parti.push(`${spostati} aggiornati`);
  return { ok: parti.join(", ") + "." };
}
