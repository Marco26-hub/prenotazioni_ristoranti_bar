import { db } from "@repo/shared/db";
import { auth } from "@/auth";
import { formatPriceCents } from "@repo/shared";
import { addCategory, addMenuItem, toggleItemAvailable, deleteMenuItem } from "./actions";

export default async function MenuPage() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  interface ItemRow {
    id: string;
    category_id: string | null;
    name: string;
    price_cents: number;
    available: boolean;
  }

  const sql = db();
  const categories = await sql<{ id: string; name: string }[]>`
    select id, name from menu_categories where venue_id = ${venue.venueId} order by sort_order`;
  const items = await sql<ItemRow[]>`
    select id, category_id, name, price_cents, available from menu_items
    where venue_id = ${venue.venueId} order by sort_order`;

  const itemsByCategory = new Map<string | null, ItemRow[]>();
  for (const item of items) {
    const key = item.category_id;
    if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
    itemsByCategory.get(key)!.push(item);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-4">
      <h1 className="text-xl font-semibold">Menu</h1>

      {categories.map((cat) => (
        <section key={cat.id}>
          <h2 className="mb-2 font-medium">{cat.name}</h2>
          <ul className="divide-y rounded border">
            {(itemsByCategory.get(cat.id) ?? []).map((item) => (
              <MenuItemRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}

      {itemsByCategory.get(null) && (
        <section>
          <h2 className="mb-2 font-medium">Senza categoria</h2>
          <ul className="divide-y rounded border">
            {itemsByCategory.get(null)!.map((item) => (
              <MenuItemRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}

      <section className="rounded border p-4">
        <h2 className="mb-2 font-medium">Aggiungi categoria</h2>
        <form action={addCategory} className="flex gap-2">
          <input name="name" placeholder="Nome categoria" required className="flex-1 rounded border p-2" />
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">
            Aggiungi
          </button>
        </form>
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-2 font-medium">Aggiungi piatto</h2>
        <form action={addMenuItem} className="space-y-2">
          <input name="name" placeholder="Nome piatto" required className="w-full rounded border p-2" />
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Prezzo (€)"
            required
            className="w-full rounded border p-2"
          />
          <select name="categoryId" className="w-full rounded border p-2">
            <option value="">Nessuna categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button type="submit" className="w-full rounded bg-black py-2 text-white">
            Aggiungi piatto
          </button>
        </form>
      </section>
    </main>
  );
}

function MenuItemRow({
  item,
}: {
  item: { id: string; name: string; price_cents: number; available: boolean };
}) {
  return (
    <li className="flex items-center justify-between p-3">
      <span className={item.available ? "" : "text-gray-400 line-through"}>
        {item.name} — {formatPriceCents(item.price_cents)}
      </span>
      <div className="flex gap-2 text-sm">
        <form
          action={async () => {
            "use server";
            await toggleItemAvailable(item.id, !item.available);
          }}
        >
          <button type="submit" className="underline">
            {item.available ? "Nascondi" : "Riattiva"}
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await deleteMenuItem(item.id);
          }}
        >
          <button type="submit" className="text-red-600 underline">
            Elimina
          </button>
        </form>
      </div>
    </li>
  );
}
