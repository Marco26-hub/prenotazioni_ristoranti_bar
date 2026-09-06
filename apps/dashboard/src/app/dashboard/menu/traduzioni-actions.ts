"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";
import { LINGUE, type Traduzioni } from "@repo/shared/lingue";
import { linguaUtente } from "@/lib/lingua";
import { tMenuAdmin } from "@/i18n/menu";

export interface EsitoTraduzione {
  error?: string;
  success?: string;
}

const CODICI = new Set(LINGUE.map((l) => l.codice));

/** Salva la traduzione di un piatto in una lingua. */
export async function salvaTraduzione(formData: FormData): Promise<EsitoTraduzione> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tMenuAdmin(await linguaUtente());

  const itemId = String(formData.get("itemId") ?? "");
  const lingua = String(formData.get("lingua") ?? "");
  if (!itemId || !CODICI.has(lingua)) return { error: t("traduzioni.errore.richiesta") };

  const campo = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? undefined : v.slice(0, 600);
  };

  const sql = db();
  const [riga] = await sql<{ translations: Traduzioni }[]>`
    select translations from menu_items
     where id = ${itemId} and venue_id = ${venue.venueId}`;
  if (!riga) return { error: t("traduzioni.errore.piatto") };

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
  return { success: t("traduzioni.salvato") };
}

/**
 * Salva la traduzione di una categoria in una lingua.
 *
 * La colonna esisteva ed era già applicata al menu del cliente, ma nel
 * gestionale non c'era nessun punto in cui scriverla: il cinese al tavolo
 * leggeva i piatti in cinese incolonnati sotto "Nigiri e sashimi". In un all
 * you can eat le categorie sono la mappa con cui si ordina a ondate.
 *
 * Di una categoria si traduce il solo nome: descrizione e ingredienti sono
 * del piatto.
 */
export async function salvaTraduzioneCategoria(
  formData: FormData
): Promise<EsitoTraduzione> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tMenuAdmin(await linguaUtente());

  const categoryId = String(formData.get("categoryId") ?? "");
  const lingua = String(formData.get("lingua") ?? "");
  if (!categoryId || !CODICI.has(lingua)) {
    return { error: t("traduzioni.errore.richiesta") };
  }

  const nome = String(formData.get("name") ?? "").trim().slice(0, 600);

  const sql = db();
  const [riga] = await sql<{ translations: Traduzioni }[]>`
    select translations from menu_categories
     where id = ${categoryId} and venue_id = ${venue.venueId}`;
  if (!riga) return { error: t("traduzioni.errore.richiesta") };

  const nuove: Traduzioni = { ...riga.translations };
  // Una lingua senza nome non è una traduzione: si toglie del tutto, così la
  // testata ricade sull'italiano invece di restare un guscio vuoto.
  if (!nome) delete nuove[lingua];
  else nuove[lingua] = { name: nome };

  // postgres.js tipizza sql.json in modo stretto e non riconosce un
  // Record annidato come JSONValue: la forma è corretta, il tipo no.
  await sql`
    update menu_categories set translations = ${sql.json(nuove as never)}
     where id = ${categoryId} and venue_id = ${venue.venueId}`;

  revalidatePath("/dashboard/menu");
  return { success: t("traduzioni.salvato") };
}

/** Lingue offerte dal locale, oltre all'italiano. */
export async function salvaLingue(formData: FormData): Promise<EsitoTraduzione> {
  const { venue } = await requireRole(["owner", "manager"]);
  const t = tMenuAdmin(await linguaUtente());

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
        ? t("lingue.nessuna")
        : t("lingue.attivate", { n: scelte.length }),
  };
}
