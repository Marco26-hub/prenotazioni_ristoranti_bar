"use client";

import { useState, useTransition } from "react";
import { updateMenuItem } from "./actions";

export interface EditableItem {
  id: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  price_cents: number;
  vat_rate: string | number;
  category_id: string | null;
  pairing_item_id: string | null;
  allergens: string[] | null;
  dietary_tags: string[] | null;
  available: boolean;
}

const FIELD =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";
const LABEL = "block text-xs font-medium text-muted";

/**
 * Modifica di un piatto, chiusa di default.
 *
 * Un menu ha decine di piatti: tenere tutti i form aperti renderebbe la
 * pagina illeggibile proprio a chi deve trovarne uno solo.
 */
export function EditItemForm({
  item,
  categories,
  otherItems,
}: {
  item: EditableItem;
  categories: Array<{ id: string; name: string }>;
  otherItems: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex min-h-11 items-center px-1 text-sm underline"
      >
        Modifica
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        setMessage(null);
        start(async () => {
          const res = await updateMenuItem(formData);
          if (res.error) setError(res.error);
          else {
            setMessage("Salvato");
            setOpen(false);
          }
        });
      }}
      className="mt-3 space-y-3 rounded-lg border border-border p-3"
    >
      <input type="hidden" name="itemId" value={item.id} />

      <div>
        <label className={LABEL} htmlFor={`name-${item.id}`}>
          Nome
        </label>
        <input
          id={`name-${item.id}`}
          name="name"
          defaultValue={item.name}
          required
          className={FIELD}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={LABEL} htmlFor={`price-${item.id}`}>
            Prezzo (€)
          </label>
          <input
            id={`price-${item.id}`}
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={(item.price_cents / 100).toFixed(2)}
            required
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`vat-${item.id}`}>
            IVA (%)
          </label>
          <input
            id={`vat-${item.id}`}
            name="vatRate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={Number(item.vat_rate)}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor={`cat-${item.id}`}>
          Categoria
        </label>
        <select
          id={`cat-${item.id}`}
          name="categoryId"
          defaultValue={item.category_id ?? ""}
          className={FIELD}
        >
          <option value="">Nessuna categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL} htmlFor={`desc-${item.id}`}>
          Descrizione
        </label>
        <textarea
          id={`desc-${item.id}`}
          name="description"
          defaultValue={item.description ?? ""}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`ingr-${item.id}`}>
          Ingredienti
        </label>
        <textarea
          id={`ingr-${item.id}`}
          name="ingredients"
          defaultValue={item.ingredients ?? ""}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`all-${item.id}`}>
          Allergeni — separati da virgola. Obbligatori per legge se presenti
        </label>
        <input
          id={`all-${item.id}`}
          name="allergens"
          defaultValue={(item.allergens ?? []).join(", ")}
          placeholder="glutine, uova, latte"
          className={FIELD}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`diet-${item.id}`}>
          Diciture — vegetariano, vegano, senza_glutine, senza_lattosio, piccante
        </label>
        <input
          id={`diet-${item.id}`}
          name="dietaryTags"
          defaultValue={(item.dietary_tags ?? []).join(", ")}
          placeholder="vegetariano, piccante"
          className={FIELD}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`pair-${item.id}`}>
          Si abbina bene con
        </label>
        <select
          id={`pair-${item.id}`}
          name="pairingItemId"
          defaultValue={item.pairing_item_id ?? ""}
          className={FIELD}
        >
          <option value="">Nessun abbinamento</option>
          {otherItems.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="available"
          defaultChecked={item.available}
          className="h-5 w-5"
        />
        Disponibile — se tolto, il piatto sparisce dal menu del cliente
      </label>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-muted">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 flex-1 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Salvataggio…" : "Salva modifiche"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 rounded-full border border-border px-5 text-sm"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
