"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue, requireRole } from "@/lib/authz";

export async function addCategory(formData: FormData) {
  const { venue } = await requireRole(["owner", "manager"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const sql = db();
  // In coda, non in testa: chi aggiunge una categoria non si aspetta di
  // vedersela comparire prima degli antipasti.
  await sql`insert into menu_categories (venue_id, name, sort_order)
    values (${venue.venueId}, ${name},
      coalesce((select max(sort_order) + 1 from menu_categories
                where venue_id = ${venue.venueId}), 0))`;
  revalidatePath("/dashboard/menu");
}

export async function addMenuItem(formData: FormData) {
  const { venue } = await requireRole(["owner", "manager"]);
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const priceEuro = Number.parseFloat(String(formData.get("price") ?? "0"));
  if (!name || !Number.isFinite(priceEuro) || priceEuro < 0) return;

  const sql = db();

  // Il piatto deve appartenere allo stesso venue di chi chiama — la
  // categoria arriva dal client, va rivalidata qui prima di fidarsene.
  if (categoryId) {
    const [cat] = await sql<{ id: string }[]>`
      select id from menu_categories where id = ${categoryId} and venue_id = ${venue.venueId}`;
    if (!cat) return;
  }

  await sql`
    insert into menu_items (venue_id, category_id, name, price_cents, sort_order)
    values (${venue.venueId}, ${categoryId}, ${name}, ${Math.round(priceEuro * 100)},
      coalesce((select max(sort_order) + 1 from menu_items
                where venue_id = ${venue.venueId}
                  and category_id is not distinct from ${categoryId}), 0))`;
  revalidatePath("/dashboard/menu");
}

export async function updateMenuItemPrice(formData: FormData) {
  const { venue } = await requireRole(["owner", "manager"]);
  const itemId = String(formData.get("itemId") ?? "");
  const priceEuro = Number.parseFloat(String(formData.get("price") ?? ""));
  if (!itemId || !Number.isFinite(priceEuro) || priceEuro < 0) return;

  const sql = db();
  await sql`
    update menu_items
       set price_cents = ${Math.round(priceEuro * 100)}
     where id = ${itemId} and venue_id = ${venue.venueId}`;
  revalidatePath("/dashboard/menu");
}

/**
 * Duplica la scheda completa e le sue varianti. La copia resta accanto
 * all'originale, così il ristoratore può aprirla e cambiare solo i campi
 * che distinguono la nuova voce.
 */
export async function duplicateMenuItem(itemId: string) {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();

  await sql.begin(async (tx) => {
    const [source] = await tx<
      { id: string; category_id: string | null; sort_order: number | null }[]
    >`
      select id, category_id, sort_order
        from menu_items
       where id = ${itemId} and venue_id = ${venue.venueId}
       for update`;
    if (!source) return;

    const nextOrder = (source.sort_order ?? 0) + 1;
    await tx`
      update menu_items
         set sort_order = coalesce(sort_order, 0) + 1
       where venue_id = ${venue.venueId}
         and category_id is not distinct from ${source.category_id}
         and coalesce(sort_order, 0) >= ${nextOrder}`;

    const [copy] = await tx<{ id: string }[]>`
      insert into menu_items (
        venue_id, category_id, name, description, price_cents, vat_rate,
        image_url, allergens, dietary_tags, ingredients, kind, producer,
        vintage, denomination, origin, abv, serving_note, subcategory,
        product_style, format, grape_variety, service_type, conservation,
        origin_note, translations, pairing_item_id, available, sort_order
      )
      select venue_id, category_id, 'Copia di ' || name, description,
             price_cents, vat_rate, image_url, allergens, dietary_tags,
             ingredients, kind, producer, vintage, denomination, origin,
             abv, serving_note, subcategory, product_style, format,
             grape_variety, service_type, conservation, origin_note,
             translations, pairing_item_id, available, ${nextOrder}
        from menu_items
       where id = ${source.id} and venue_id = ${venue.venueId}
      returning id`;
    if (!copy) return;

    const groups = await tx<
      {
        id: string;
        name: string;
        kind: string;
        required: boolean;
        min_choices: number;
        max_choices: number;
        sort_order: number;
        translations: object;
      }[]
    >`
      select id, name, kind, required, min_choices, max_choices, sort_order,
             translations
        from menu_option_groups
       where menu_item_id = ${source.id}
       order by sort_order`;

    for (const group of groups) {
      const [newGroup] = await tx<{ id: string }[]>`
        insert into menu_option_groups (
          venue_id, menu_item_id, name, kind, required, min_choices,
          max_choices, sort_order, translations
        ) values (
          ${venue.venueId}, ${copy.id}, ${group.name}, ${group.kind},
          ${group.required}, ${group.min_choices}, ${group.max_choices},
          ${group.sort_order}, ${tx.json(group.translations as never)}
        ) returning id`;

      await tx`
        insert into menu_options (
          group_id, name, price_delta_cents, available, sort_order,
          translations
        )
        select ${newGroup.id}, name, price_delta_cents, available, sort_order,
               translations
          from menu_options
         where group_id = ${group.id}`;
    }
  });

  revalidatePath("/dashboard/menu");
}

/**
 * Modifica di un piatto già a menu.
 *
 * Prende tutti i campi in un colpo solo: il form è uno, e un salvataggio
 * parziale lascerebbe il piatto in uno stato che il ristoratore non ha
 * scelto. I campi vuoti diventano NULL — è il modo per togliere un valore
 * senza un bottone "cancella campo" per ognuno.
 */
export async function updateMenuItem(formData: FormData): Promise<{ error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);
  const itemId = String(formData.get("itemId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const priceEuro = Number.parseFloat(String(formData.get("price") ?? ""));

  if (!itemId) return { error: "Piatto non indicato" };
  if (!name) return { error: "Il nome è obbligatorio" };
  if (!Number.isFinite(priceEuro) || priceEuro < 0) return { error: "Prezzo non valido" };

  const text = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    return v === "" ? null : v;
  };

  // Allergeni e diciture dietetiche arrivano come lista separata da virgole:
  // è il modo in cui un ristoratore le scrive davvero.
  const list = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return null;
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : null;
  };

  const vatRaw = Number.parseFloat(String(formData.get("vatRate") ?? ""));
  const vatRate = Number.isFinite(vatRaw) && vatRaw >= 0 && vatRaw <= 100 ? vatRaw : 10;

  const KIND = ["food", "wine", "beer", "drink"];
  const kindGrezzo = String(formData.get("kind") ?? "food");
  const kind = KIND.includes(kindGrezzo) ? kindGrezzo : "food";

  // Numeri facoltativi: vuoto significa "non lo so", non zero. Un vino
  // senza annata dichiarata è normale; uno da 0 gradi no.
  const numero = (chiave: string, min: number, max: number) => {
    const grezzo = String(formData.get(chiave) ?? "").trim();
    if (grezzo === "") return null;
    const n = Number(grezzo);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };

  const CONSERVAZIONE = ["fresco", "congelato", "surgelato", "abbattuto"];
  const consGrezza = String(formData.get("conservation") ?? "fresco");
  const conservation = CONSERVAZIONE.includes(consGrezza) ? consGrezza : "fresco";

  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const pairingId = String(formData.get("pairingItemId") ?? "") || null;

  const sql = db();

  // Categoria e abbinamento arrivano dal client: vanno riverificati contro
  // questo venue, o si potrebbe puntare al piatto di un altro locale.
  if (categoryId) {
    const [cat] = await sql<{ id: string }[]>`
      select id from menu_categories where id = ${categoryId} and venue_id = ${venue.venueId}`;
    if (!cat) return { error: "Categoria non valida" };
  }
  if (pairingId) {
    if (pairingId === itemId) return { error: "Un piatto non può abbinarsi a se stesso" };
    const [pair] = await sql<{ id: string }[]>`
      select id from menu_items where id = ${pairingId} and venue_id = ${venue.venueId}`;
    if (!pair) return { error: "Abbinamento non valido" };
  }

  const [updated] = await sql<{ id: string }[]>`
    update menu_items set
      name = ${name},
      description = ${text("description")},
      ingredients = ${text("ingredients")},
      price_cents = ${Math.round(priceEuro * 100)},
      vat_rate = ${vatRate},
      category_id = ${categoryId},
      pairing_item_id = ${pairingId},
      allergens = ${list("allergens")},
      kind = ${kind},
      producer = ${text("producer")},
      origin = ${text("origin")},
      denomination = ${text("denomination")},
      vintage = ${numero("vintage", 1900, 2100)},
      abv = ${numero("abv", 0, 80)},
      serving_note = ${text("servingNote")},
      subcategory = ${text("subcategory")},
      product_style = ${text("productStyle")},
      format = ${text("format")},
      grape_variety = ${text("grapeVariety")},
      service_type = ${text("serviceType")},
      conservation = ${conservation},
      origin_note = ${text("originNote")},
      dietary_tags = ${list("dietaryTags")},
      available = ${formData.get("available") === "on"}
    where id = ${itemId} and venue_id = ${venue.venueId}
    returning id`;

  if (!updated) return { error: "Piatto non trovato" };

  revalidatePath("/dashboard/menu");
  return {};
}

export async function updateCategory(formData: FormData): Promise<{ error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);
  const categoryId = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!categoryId || !name) return { error: "Nome categoria mancante" };

  const sql = db();
  const [row] = await sql<{ id: string }[]>`
    update menu_categories set name = ${name}
    where id = ${categoryId} and venue_id = ${venue.venueId}
    returning id`;

  if (!row) return { error: "Categoria non trovata" };
  revalidatePath("/dashboard/menu");
  return {};
}

/**
 * I piatti non vengono cancellati insieme alla categoria: finirebbero
 * distrutti per una riorganizzazione del menu. Restano, senza categoria,
 * e il ristoratore decide dove rimetterli.
 */
export async function deleteCategory(categoryId: string): Promise<{ error?: string }> {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();

  const [cat] = await sql<{ id: string }[]>`
    select id from menu_categories where id = ${categoryId} and venue_id = ${venue.venueId}`;
  if (!cat) return { error: "Categoria non trovata" };

  await sql.begin(async (tx) => {
    await tx`update menu_items set category_id = null
      where category_id = ${categoryId} and venue_id = ${venue.venueId}`;
    await tx`delete from menu_categories
      where id = ${categoryId} and venue_id = ${venue.venueId}`;
  });

  revalidatePath("/dashboard/menu");
  return {};
}

/**
 * Riordino per scambio con il vicino. L'ordine del menu è una scelta di
 * vendita — gli antipasti prima dei dolci — e finora non era modificabile.
 */
export async function moveMenuItem(itemId: string, direction: "up" | "down") {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();

  const [item] = await sql<{ id: string; sort_order: number; category_id: string | null }[]>`
    select id, sort_order, category_id from menu_items
    where id = ${itemId} and venue_id = ${venue.venueId}`;
  if (!item) return;

  // `is not distinct from` tratta due NULL come uguali: senza, i piatti
  // fuori categoria non troverebbero mai un vicino con cui scambiarsi.
  const [neighbour] = await sql<{ id: string; sort_order: number }[]>`
    select id, sort_order from menu_items
    where venue_id = ${venue.venueId}
      and category_id is not distinct from ${item.category_id}
      and ${direction === "up" ? sql`sort_order < ${item.sort_order}` : sql`sort_order > ${item.sort_order}`}
    order by ${direction === "up" ? sql`sort_order desc` : sql`sort_order asc`}
    limit 1`;

  if (!neighbour) return;

  await sql.begin(async (tx) => {
    await tx`update menu_items set sort_order = ${neighbour.sort_order} where id = ${item.id}`;
    await tx`update menu_items set sort_order = ${item.sort_order} where id = ${neighbour.id}`;
  });

  revalidatePath("/dashboard/menu");
}

export async function moveCategory(categoryId: string, direction: "up" | "down") {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();

  const [cat] = await sql<{ id: string; sort_order: number }[]>`
    select id, sort_order from menu_categories
    where id = ${categoryId} and venue_id = ${venue.venueId}`;
  if (!cat) return;

  const [neighbour] = await sql<{ id: string; sort_order: number }[]>`
    select id, sort_order from menu_categories
    where venue_id = ${venue.venueId}
      and ${direction === "up" ? sql`sort_order < ${cat.sort_order}` : sql`sort_order > ${cat.sort_order}`}
    order by ${direction === "up" ? sql`sort_order desc` : sql`sort_order asc`}
    limit 1`;

  if (!neighbour) return;

  await sql.begin(async (tx) => {
    await tx`update menu_categories set sort_order = ${neighbour.sort_order} where id = ${cat.id}`;
    await tx`update menu_categories set sort_order = ${cat.sort_order} where id = ${neighbour.id}`;
  });

  revalidatePath("/dashboard/menu");
}

export async function toggleItemAvailable(itemId: string, available: boolean) {
  const { venue } = await requireVenue();
  const sql = db();
  await sql`
    update menu_items set available = ${available}
    where id = ${itemId} and venue_id = ${venue.venueId}`;
  revalidatePath("/dashboard/menu");
}

export async function deleteMenuItem(itemId: string) {
  const { venue } = await requireRole(["owner", "manager"]);
  const sql = db();
  await sql`delete from menu_items where id = ${itemId} and venue_id = ${venue.venueId}`;
  revalidatePath("/dashboard/menu");
}
