"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { LINGUE, type Traduzioni } from "@repo/shared/lingue";

export interface EsitoTraduzione {
  error?: string;
  success?: string;
}

const CODICI = new Set(LINGUE.map((l) => l.codice));

/** Salva la traduzione di un piatto in una lingua. */
export async function salvaTraduzione(formData: FormData): Promise<EsitoTraduzione> {
  const { venue } = await requireRole(["owner", "manager"]);

  const itemId = String(formData.get("itemId") ?? "");
  const lingua = String(formData.get("lingua") ?? "");
  if (!itemId || !CODICI.has(lingua)) return { error: "Richiesta non valida" };

  const campo = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? undefined : v.slice(0, 600);
  };

  const sql = db();
  const [riga] = await sql<{ translations: Traduzioni }[]>`
    select translations from menu_items
     where id = ${itemId} and venue_id = ${venue.venueId}`;
  if (!riga) return { error: "Piatto non trovato" };

  const nuove: Traduzioni = { ...riga.translations };
  const valori = {
    name: campo("name"),
    description: campo("description"),
    ingredients: campo("ingredients"),
  };

  // Una lingua senza nemmeno il nome non è una traduzione: si toglie del
  // tutto, così il conteggio di quelle mancanti resta veritiero.
  if (!valori.name && !valori.description && !valori.ingredients) {
    delete nuove[lingua];
  } else {
    nuove[lingua] = valori;
  }

  // postgres.js tipizza sql.json in modo stretto e non riconosce un
  // Record annidato come JSONValue: la forma è corretta, il tipo no.
  await sql`
    update menu_items set translations = ${sql.json(nuove as never)}
     where id = ${itemId} and venue_id = ${venue.venueId}`;

  revalidatePath("/dashboard/menu");
  return { success: "Salvato" };
}

/** Lingue offerte dal locale, oltre all'italiano. */
export async function salvaLingue(formData: FormData): Promise<EsitoTraduzione> {
  const { venue } = await requireRole(["owner", "manager"]);

  const scelte = formData
    .getAll("lingue")
    .map(String)
    .filter((c) => CODICI.has(c));

  const sql = db();
  await sql`update venues set languages = ${scelte} where id = ${venue.venueId}`;

  revalidatePath("/dashboard/menu");
  revalidatePath("/dashboard/settings");

  return {
    success:
      scelte.length === 0
        ? "Menu solo in italiano: al cliente non compare nessun selettore."
        : `Attivate ${scelte.length} lingue. Traduci i piatti da qui sotto.`,
  };
}
