import { db } from "@repo/shared/db";
import { auth } from "@/auth";
import { formatPriceCents } from "@repo/shared";
import {
  addCategory,
  addMenuItem,
  toggleItemAvailable,
  deleteMenuItem,
  deleteCategory,
  updateCategory,
  moveMenuItem,
  moveCategory,
} from "./actions";
import { ImportForm } from "./import-form";
import { PhotoForm } from "./photo-form";
import { TilbyImportForm } from "./tilby-import-form";
import { EditItemForm, type EditableItem } from "./edit-item-form";

const ACTION_LINK = "flex min-h-11 items-center px-1 text-sm underline";

type ItemRow = EditableItem & { image_url: string | null };

/**
 * `updateCategory` risponde con un eventuale errore, ma una Server Action
 * usata come `action` di un form deve restituire void. Il rename fallisce
 * solo con nome vuoto o categoria inesistente: in entrambi i casi il nome
 * vecchio resta a schermo, quindi l'esito è già visibile senza messaggio.
 */
async function renameCategory(formData: FormData) {
  "use server";
  await updateCategory(formData);
}

export default async function MenuPage() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  const sql = db();
  const [venueRow] = await sql<{ tilby_token: string | null }[]>`
    select tilby_token from venues where id = ${venue.venueId}`;

  const categories = await sql<{ id: string; name: string }[]>`
    select id, name from menu_categories where venue_id = ${venue.venueId}
    order by sort_order, name`;

  const items = await sql<ItemRow[]>`
    select id, category_id, name, description, ingredients, price_cents, vat_rate,
           pairing_item_id, allergens, dietary_tags, available, image_url
      from menu_items
     where venue_id = ${venue.venueId}
     order by sort_order, name`;

  const itemsByCategory = new Map<string | null, ItemRow[]>();
  for (const item of items) {
    const key = item.category_id;
    if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
    itemsByCategory.get(key)!.push(item);
  }

  const allNames = items.map((i) => ({ id: i.id, name: i.name }));

  function renderItems(list: ItemRow[]) {
    return (
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {list.map((item, index) => (
          <li key={item.id} className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={item.available ? "" : "text-muted line-through"}>
                {item.name} — {formatPriceCents(item.price_cents)}
              </span>
              <div className="flex shrink-0 flex-wrap items-center gap-x-3">
                {index > 0 && (
                  <form
                    action={async () => {
                      "use server";
                      await moveMenuItem(item.id, "up");
                    }}
                  >
                    <button type="submit" aria-label={`Sposta ${item.name} su`} className={ACTION_LINK}>
                      ↑
                    </button>
                  </form>
                )}
                {index < list.length - 1 && (
                  <form
                    action={async () => {
                      "use server";
                      await moveMenuItem(item.id, "down");
                    }}
                  >
                    <button type="submit" aria-label={`Sposta ${item.name} giù`} className={ACTION_LINK}>
                      ↓
                    </button>
                  </form>
                )}
                <form
                  action={async () => {
                    "use server";
                    await toggleItemAvailable(item.id, !item.available);
                  }}
                >
                  <button type="submit" className={ACTION_LINK}>
                    {item.available ? "Nascondi" : "Riattiva"}
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await deleteMenuItem(item.id);
                  }}
                >
                  <button type="submit" className={`${ACTION_LINK} text-danger`}>
                    Elimina
                  </button>
                </form>
              </div>
            </div>

            <EditItemForm
              item={item}
              categories={categories}
              otherItems={allNames.filter((o) => o.id !== item.id)}
            />
            <PhotoForm itemId={item.id} imageUrl={item.image_url} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-5">
      <h1 className="text-lg font-semibold">Menu</h1>

      {categories.map((cat, index) => (
        <section key={cat.id}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <form action={renameCategory} className="flex min-w-0 flex-1 gap-2">
              <input type="hidden" name="categoryId" value={cat.id} />
              <input
                name="name"
                defaultValue={cat.name}
                aria-label={`Nome della categoria ${cat.name}`}
                className="min-h-11 w-full min-w-0 flex-1 rounded-lg border border-border bg-background px-3 font-semibold"
              />
              <button type="submit" className="min-h-11 rounded-lg border border-border px-3 text-sm">
                Rinomina
              </button>
            </form>
            <div className="flex shrink-0 items-center gap-x-3">
              {index > 0 && (
                <form
                  action={async () => {
                    "use server";
                    await moveCategory(cat.id, "up");
                  }}
                >
                  <button type="submit" aria-label={`Sposta ${cat.name} su`} className={ACTION_LINK}>
                    ↑
                  </button>
                </form>
              )}
              {index < categories.length - 1 && (
                <form
                  action={async () => {
                    "use server";
                    await moveCategory(cat.id, "down");
                  }}
                >
                  <button type="submit" aria-label={`Sposta ${cat.name} giù`} className={ACTION_LINK}>
                    ↓
                  </button>
                </form>
              )}
              <form
                action={async () => {
                  "use server";
                  await deleteCategory(cat.id);
                }}
              >
                <button type="submit" className={`${ACTION_LINK} text-danger`}>
                  Elimina categoria
                </button>
              </form>
            </div>
          </div>
          {renderItems(itemsByCategory.get(cat.id) ?? [])}
        </section>
      ))}

      {itemsByCategory.get(null) && (
        <section>
          <h2 className="mb-2 font-semibold">Senza categoria</h2>
          {renderItems(itemsByCategory.get(null)!)}
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">Importa dalla cassa</h2>
        <TilbyImportForm connected={Boolean(venueRow?.tilby_token)} />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">Importa il menu da file</h2>
        <ImportForm />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">Aggiungi categoria</h2>
        <form action={addCategory} className="flex flex-wrap gap-2">
          <input
            name="name"
            placeholder="Nome categoria"
            required
            className="min-h-11 w-full min-w-0 flex-1 rounded-lg border border-border bg-background px-3 sm:w-auto"
          />
          <button
            type="submit"
            className="min-h-11 flex-1 rounded-full bg-accent px-5 font-medium text-accent-foreground active:scale-95 sm:flex-none"
          >
            Aggiungi
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">Aggiungi piatto</h2>
        <p className="mb-3 text-sm text-muted">
          Nome e prezzo bastano per iniziare. Descrizione, ingredienti,
          allergeni e abbinamenti si aggiungono da <em>Modifica</em>.
        </p>
        <form action={addMenuItem} className="space-y-2">
          <input
            name="name"
            placeholder="Nome piatto"
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Prezzo (€)"
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <select
            name="categoryId"
            aria-label="Categoria del nuovo piatto"
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          >
            <option value="">Nessuna categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95"
          >
            Aggiungi piatto
          </button>
        </form>
      </section>
    </main>
  );
}
