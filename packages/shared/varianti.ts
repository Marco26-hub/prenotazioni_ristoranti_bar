import "server-only";
import type { Sql } from "postgres";

/**
 * Varianti e aggiunte di un piatto.
 *
 * Il prezzo si calcola sempre qui, sul server, a partire dagli id delle
 * opzioni scelte: il client manda cosa ha scelto, mai quanto costa. Un
 * prezzo che arriva dal browser è un prezzo che chiunque può riscrivere.
 */

export interface Opzione {
  id: string;
  name: string;
  price_delta_cents: number;
  available: boolean;
}

export interface GruppoOpzioni {
  id: string;
  name: string;
  required: boolean;
  min_choices: number;
  max_choices: number;
  opzioni: Opzione[];
}

interface RigaGruppo {
  id: string;
  menu_item_id: string;
  name: string;
  required: boolean;
  min_choices: number;
  max_choices: number;
}

interface RigaOpzione {
  id: string;
  group_id: string;
  name: string;
  price_delta_cents: number;
  available: boolean;
}

/** Gruppi e opzioni di più piatti in due query invece di due per piatto. */
export async function gruppiPerPiatti(
  sql: Sql,
  venueId: string,
  itemIds: string[]
): Promise<Map<string, GruppoOpzioni[]>> {
  const perPiatto = new Map<string, GruppoOpzioni[]>();
  if (itemIds.length === 0) return perPiatto;

  const gruppi = await sql<RigaGruppo[]>`
    select id, menu_item_id, name, required, min_choices, max_choices
      from menu_option_groups
     where venue_id = ${venueId} and menu_item_id in ${sql(itemIds)}
     order by sort_order, name`;

  if (gruppi.length === 0) return perPiatto;

  const opzioni = await sql<RigaOpzione[]>`
    select id, group_id, name, price_delta_cents, available
      from menu_options
     where group_id in ${sql(gruppi.map((g) => g.id))}
     order by sort_order, name`;

  const perGruppo = new Map<string, Opzione[]>();
  for (const o of opzioni) {
    const lista = perGruppo.get(o.group_id) ?? [];
    lista.push(o);
    perGruppo.set(o.group_id, lista);
  }

  for (const g of gruppi) {
    const lista = perPiatto.get(g.menu_item_id) ?? [];
    lista.push({
      id: g.id,
      name: g.name,
      required: g.required,
      min_choices: g.min_choices,
      max_choices: g.max_choices,
      opzioni: perGruppo.get(g.id) ?? [],
    });
    perPiatto.set(g.menu_item_id, lista);
  }

  return perPiatto;
}

export interface SceltaSalvata {
  gruppo: string;
  opzione: string;
  supplemento: number;
}

export interface EsitoPrezzo {
  errore?: string;
  prezzoUnitario?: number;
  scelte?: SceltaSalvata[];
}

/**
 * Verifica le scelte e calcola il prezzo unitario definitivo.
 *
 * Rifiuta invece di correggere: una scelta obbligatoria mancante o
 * un'opzione esaurita significa che il cliente sta guardando un menu
 * diverso da quello attuale, e servirlo comunque produrrebbe una comanda
 * che la cucina non può eseguire.
 */
export function calcolaPrezzo(
  prezzoBase: number,
  gruppi: GruppoOpzioni[],
  scelteIds: string[]
): EsitoPrezzo {
  const scelte: SceltaSalvata[] = [];
  let totale = prezzoBase;
  const usati = new Set<string>();

  for (const g of gruppi) {
    const nelGruppo = g.opzioni.filter((o) => scelteIds.includes(o.id));

    if (nelGruppo.length < g.min_choices || (g.required && nelGruppo.length === 0)) {
      return { errore: `Scegli ${g.name.toLowerCase()}` };
    }
    if (nelGruppo.length > g.max_choices) {
      return {
        errore:
          g.max_choices === 1
            ? `Per ${g.name.toLowerCase()} puoi scegliere una sola opzione`
            : `Per ${g.name.toLowerCase()} puoi scegliere al massimo ${g.max_choices} opzioni`,
      };
    }

    for (const o of nelGruppo) {
      if (!o.available) return { errore: `${o.name} non è disponibile` };
      totale += o.price_delta_cents;
      usati.add(o.id);
      scelte.push({ gruppo: g.name, opzione: o.name, supplemento: o.price_delta_cents });
    }
  }

  // Un id che non appartiene a nessun gruppo del piatto: o il menu è
  // cambiato sotto i piedi, o qualcuno sta provando a scontarsi il conto.
  const estranei = scelteIds.filter((id) => !usati.has(id));
  if (estranei.length > 0) return { errore: "Scelte non valide per questo piatto" };

  // Un supplemento negativo mal configurato non deve poter azzerare il conto.
  if (totale < 0) return { errore: "Prezzo non valido per questa combinazione" };

  return { prezzoUnitario: totale, scelte };
}

/** Riga leggibile per la comanda: "12 pezzi · Avocado". */
export function descriviScelte(scelte: SceltaSalvata[] | null | undefined): string | null {
  if (!scelte || scelte.length === 0) return null;
  return scelte.map((s) => s.opzione).join(" · ");
}
