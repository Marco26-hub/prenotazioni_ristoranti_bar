import { db } from "@repo/shared/db";
import { auth } from "@/auth";
import { formatPriceCents } from "@repo/shared";
import {
  addCategory,
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
import { AggiungiPiatto } from "./aggiungi-piatto";
import { TraduzioniForm } from "./traduzioni-form";
import { LingueForm } from "./lingue-form";
import { LINGUE, type Traduzioni } from "@repo/shared/lingue";
import { gruppiPerPiatti } from "@repo/shared/varianti";
import { VariantiForm, type GruppoAdmin } from "./varianti-form";

const AZIONE = "flex min-h-11 items-center px-1 text-sm underline";

type ItemRow = EditableItem & { image_url: string | null; translations: Traduzioni };

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

const DIETA_ETICHETTA: Record<string, string> = {
  vegetariano: "Vegetariano",
  vegano: "Vegano",
  senza_glutine: "Senza glutine",
  senza_lattosio: "Senza lattosio",
  piccante: "Piccante",
};

export default async function MenuPage() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  const sql = db();
  const [venueRow] = await sql<
    { tilby_token: string | null; languages: string[] }[]
  >`select tilby_token, languages from venues where id = ${venue.venueId}`;

  const lingueAttive = venueRow?.languages ?? [];

  const categories = await sql<{ id: string; name: string }[]>`
    select id, name from menu_categories where venue_id = ${venue.venueId}
    order by sort_order, name`;

  const items = await sql<ItemRow[]>`
    select id, category_id, name, description, ingredients, price_cents, vat_rate,
           pairing_item_id, allergens, dietary_tags, available, image_url,
           translations
      from menu_items
     where venue_id = ${venue.venueId}
     order by sort_order, name`;

  const itemsByCategory = new Map<string | null, ItemRow[]>();
  for (const item of items) {
    const key = item.category_id;
    if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
    itemsByCategory.get(key)!.push(item);
  }

  const varianti = await gruppiPerPiatti(
    sql,
    venue.venueId,
    items.map((i) => i.id)
  );

  const allNames = items.map((i) => ({ id: i.id, name: i.name }));
  const nomePerId = new Map(allNames.map((i) => [i.id, i.name]));

  // Un menu senza allergeni non è a norma (Reg. UE 1169/2011) e senza foto
  // vende meno: il ristoratore deve vederlo, non scoprirlo dal cliente.
  const senzaAllergeni = items.filter((i) => !i.allergens?.length).length;
  const senzaFoto = items.filter((i) => !i.image_url).length;
  const nascosti = items.filter((i) => !i.available).length;

  // Una lingua attivata a metà è peggio di una non attivata: il cliente
  // trova il selettore e poi un menu misto.
  const mancanti = lingueAttive.map((codice) => ({
    codice,
    nome: LINGUE.find((l) => l.codice === codice)?.nativo ?? codice,
    n: items.filter((i) => !i.translations?.[codice]?.name?.trim()).length,
  }));

  function renderItems(list: ItemRow[]) {
    return (
      <ul className="space-y-3">
        {list.map((item, index) => (
          <li
            key={item.id}
            className={`rounded-xl border bg-surface p-4 ${
              item.available ? "border-border" : "border-dashed border-border opacity-70"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="tabular-nums text-muted">
                    {formatPriceCents(item.price_cents)}
                  </span>
                  <span className="text-xs text-muted">
                    IVA {Number(item.vat_rate)}%
                  </span>
                  {!item.available && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                      Nascosto
                    </span>
                  )}
                </p>

                {item.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">
                    {item.description}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {item.dietary_tags?.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-accent px-2 py-0.5"
                    >
                      {DIETA_ETICHETTA[t] ?? t}
                    </span>
                  ))}

                  {item.allergens?.length ? (
                    <span className="rounded-full bg-background px-2 py-0.5 text-muted">
                      Allergeni: {item.allergens.join(", ")}
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-400 px-2 py-0.5 text-amber-700">
                      Allergeni non indicati
                    </span>
                  )}

                  {item.pairing_item_id && nomePerId.get(item.pairing_item_id) && (
                    <span className="rounded-full bg-background px-2 py-0.5 text-muted">
                      Con {nomePerId.get(item.pairing_item_id)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-x-3">
                {index > 0 && (
                  <form
                    action={async () => {
                      "use server";
                      await moveMenuItem(item.id, "up");
                    }}
                  >
                    <button
                      type="submit"
                      aria-label={`Sposta ${item.name} su`}
                      className={AZIONE}
                    >
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
                    <button
                      type="submit"
                      aria-label={`Sposta ${item.name} giù`}
                      className={AZIONE}
                    >
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
                  <button type="submit" className={AZIONE}>
                    {item.available ? "Nascondi" : "Riattiva"}
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await deleteMenuItem(item.id);
                  }}
                >
                  <button type="submit" className={`${AZIONE} text-danger`}>
                    Elimina
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <PhotoForm itemId={item.id} imageUrl={item.image_url} />
            </div>

            <EditItemForm
              item={item}
              categories={categories}
              otherItems={allNames.filter((o) => o.id !== item.id)}
            />

            <VariantiForm
              itemId={item.id}
              gruppi={(varianti.get(item.id) ?? []) as GruppoAdmin[]}
            />

            <TraduzioniForm
              itemId={item.id}
              nomeItaliano={item.name}
              descrizioneItaliana={item.description}
              lingueAttive={lingueAttive}
              traduzioni={item.translations}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-semibold">Menu</h1>
          <p className="text-sm text-muted">
            {items.length} piatti in {categories.length} categorie
          </p>
        </div>

        {(senzaAllergeni > 0 || senzaFoto > 0 || nascosti > 0) && (
          <ul className="flex flex-wrap gap-2 text-xs">
            {senzaAllergeni > 0 && (
              <li className="rounded-full border border-amber-400 px-3 py-1 text-amber-700">
                {senzaAllergeni} senza allergeni — obbligatori per legge
              </li>
            )}
            {senzaFoto > 0 && (
              <li className="rounded-full border border-border px-3 py-1 text-muted">
                {senzaFoto} senza foto
              </li>
            )}
            {nascosti > 0 && (
              <li className="rounded-full border border-border px-3 py-1 text-muted">
                {nascosti} nascosti al cliente
              </li>
            )}
            {mancanti
              .filter((m) => m.n > 0)
              .map((m) => (
                <li
                  key={m.codice}
                  className="rounded-full border border-amber-400 px-3 py-1 text-amber-700"
                >
                  {m.n} da tradurre in {m.nome}
                </li>
              ))}
          </ul>
        )}
      </header>

      {categories.map((cat, index) => (
        <section key={cat.id} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <form action={renameCategory} className="flex min-w-0 flex-1 gap-2">
              <input type="hidden" name="categoryId" value={cat.id} />
              <input
                name="name"
                defaultValue={cat.name}
                aria-label={`Nome della categoria ${cat.name}`}
                className="min-h-11 w-full min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-base font-semibold hover:border-border focus:border-border focus:bg-background"
              />
              <button
                type="submit"
                className="min-h-11 shrink-0 rounded-lg border border-border px-3 text-sm"
              >
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
                  <button
                    type="submit"
                    aria-label={`Sposta ${cat.name} su`}
                    className={AZIONE}
                  >
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
                  <button
                    type="submit"
                    aria-label={`Sposta ${cat.name} giù`}
                    className={AZIONE}
                  >
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
                <button type="submit" className={`${AZIONE} text-danger`}>
                  Elimina categoria
                </button>
              </form>
            </div>
          </div>

          {renderItems(itemsByCategory.get(cat.id) ?? [])}

          <AggiungiPiatto categoryId={cat.id} categoryName={cat.name} />
        </section>
      ))}

      {itemsByCategory.get(null) && (
        <section className="space-y-3">
          <h2 className="px-2 text-base font-semibold">Senza categoria</h2>
          {renderItems(itemsByCategory.get(null)!)}
        </section>
      )}

      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="font-semibold">Nuova categoria</h2>
        <form action={addCategory} className="flex flex-wrap gap-2">
          <input
            name="name"
            placeholder="Antipasti, Primi, Dolci…"
            required
            className="min-h-11 w-full min-w-0 flex-1 rounded-lg border border-border bg-background px-3 sm:w-auto"
          />
          <button
            type="submit"
            className="min-h-11 flex-1 rounded-full bg-accent px-5 font-medium text-accent-foreground sm:flex-none"
          >
            Aggiungi categoria
          </button>
        </form>
        {categories.length === 0 && (
          <AggiungiPiatto categoryId={null} categoryName="nessuna categoria" />
        )}
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="font-semibold">Lingue del menu</h2>
        <LingueForm attive={lingueAttive} />
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="font-semibold">Importa un menu esistente</h2>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-medium">Dalla cassa</h3>
          <TilbyImportForm connected={Boolean(venueRow?.tilby_token)} />
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-medium">Da file CSV o TSV</h3>
          <ImportForm />
        </div>
      </section>
    </main>
  );
}
