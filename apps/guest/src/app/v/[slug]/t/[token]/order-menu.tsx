"use client";

import { useMemo, useState } from "react";
import { formatPriceCents } from "@repo/shared";
import { DishSheet, type DishDetail } from "./dish-sheet";

interface MenuCategory {
  id: string;
  name: string;
}

interface MenuItem extends DishDetail {
  category_id: string | null;
}

interface CartLine {
  menuItemId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes?: string;
  optionIds: string[];
  /** "12 pezzi · Avocado", per mostrare al cliente cosa ha scelto. */
  optionsLabel: string | null;
}

/**
 * Chiave della riga di carrello.
 *
 * Lo stesso piatto con varianti diverse è una riga diversa: due sushi da 6
 * e uno da 12 non si sommano, hanno prezzo e comanda distinti.
 */
function chiaveRiga(itemId: string, optionIds: string[]): string {
  return optionIds.length === 0
    ? itemId
    : `${itemId}::${[...optionIds].sort().join(",")}`;
}

export function OrderMenu({
  sessionId,
  currency,
  categories,
  items,
}: {
  sessionId: string;
  currency: string;
  categories: MenuCategory[];
  items: MenuItem[];
}) {
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [openDish, setOpenDish] = useState<MenuItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string | null, MenuItem[]>();
    for (const item of items) {
      const key = item.category_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  const addItem = (
    item: MenuItem,
    optionIds: string[] = [],
    unitPriceCents?: number,
    optionsLabel: string | null = null
  ) => {
    const chiave = chiaveRiga(item.id, optionIds);
    setCart((prev) => {
      const existing = prev[chiave];
      return {
        ...prev,
        [chiave]: {
          menuItemId: item.id,
          name: item.name,
          unitPriceCents: unitPriceCents ?? item.price_cents,
          quantity: (existing?.quantity ?? 0) + 1,
          // Senza questo la nota già scritta sparirebbe premendo "+".
          notes: existing?.notes,
          optionIds,
          optionsLabel,
        },
      };
    });
  };

  const removeItem = (chiave: string) => {
    setCart((prev) => {
      const existing = prev[chiave];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const rest = { ...prev };
        delete rest[chiave];
        return rest;
      }
      return { ...prev, [chiave]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const lines = Object.values(cart);
  const totalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);

  const submitOrder = async () => {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            notes: l.notes?.trim() || undefined,
            // Solo gli id: il prezzo lo ricalcola il server.
            optionIds: l.optionIds,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Errore invio ordine");
      }
      setCart({});
      setNoteFor(null);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore invio ordine");
    } finally {
      setSubmitting(false);
    }
  };

  const setNote = (itemId: string, notes: string) => {
    setCart((prev) => (prev[itemId] ? { ...prev, [itemId]: { ...prev[itemId], notes } } : prev));
  };

  const renderItem = (item: MenuItem) => {
    // Il "+" in lista e i comandi rapidi agiscono sulla riga senza varianti:
    // le combinazioni si gestiscono dalla scheda, dove si vedono.
    const chiaveSemplice = chiaveRiga(item.id, []);
    const inCart = cart[chiaveSemplice];
    const haVarianti = (item.gruppi?.length ?? 0) > 0;
    return (
      <li
        key={item.id}
        className="rounded-xl border border-border bg-surface p-4"
      >
      <div className="flex items-start gap-3">
        {item.ha_foto && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/foto/${item.id}`}
            alt=""
            loading="lazy"
            onClick={() => setOpenDish(item)}
            className="h-20 w-20 shrink-0 cursor-pointer rounded-lg object-cover"
          />
        )}
        <button
          type="button"
          onClick={() => setOpenDish(item)}
          className="min-w-0 flex-1 text-left"
          aria-label={`Dettagli di ${item.name}`}
        >
          <p className="font-medium leading-snug">{item.name}</p>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted">
              {item.description}
            </p>
          )}
          <p className="mt-1.5 font-semibold tabular-nums">
            {formatPriceCents(item.price_cents, currency)}
          </p>
          {haVarianti && (
            <p className="mt-1 text-xs text-accent underline underline-offset-2">
              {item.gruppi!.some((g) => g.required)
                ? "Da scegliere"
                : "Varianti e aggiunte"}
            </p>
          )}
          {(item.dietary_tags?.length || item.allergens?.length) && (
            <p className="mt-1 text-xs text-muted underline underline-offset-2">
              Allergeni e dettagli
            </p>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {inCart && (
            <>
              <button
                type="button"
                onClick={() => removeItem(chiaveSemplice)}
                aria-label={`Togli ${item.name}`}
                className="h-11 w-11 rounded-full border border-border text-xl leading-none active:scale-95"
              >
                −
              </button>
              <span className="w-5 text-center font-semibold tabular-nums">
                {inCart.quantity}
              </span>
            </>
          )}
          <button
            type="button"
            // Con varianti da scegliere il "+" non può decidere al posto del
            // cliente quale: apre la scheda, dove sceglie lui.
            onClick={() => (haVarianti ? setOpenDish(item) : addItem(item))}
            aria-label={`Aggiungi ${item.name}`}
            className="h-11 w-11 rounded-full bg-accent text-xl leading-none text-accent-foreground active:scale-95"
          >
            +
          </button>
        </div>
      </div>

      {inCart && (
        <div className="mt-3 border-t border-border pt-3">
          {noteFor === item.id || inCart.notes ? (
            <input
              value={inCart.notes ?? ""}
              onChange={(e) => setNote(chiaveSemplice, e.target.value)}
              placeholder="Es. senza cipolla, senza glutine"
              maxLength={140}
              autoFocus={noteFor === item.id && !inCart.notes}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => setNoteFor(item.id)}
              className="text-sm text-muted underline underline-offset-2"
            >
              Aggiungi una nota
            </button>
          )}
        </div>
      )}
      </li>
    );
  };

  const uncategorised = itemsByCategory.get(null) ?? [];

  return (
    <div className="space-y-7 pb-28">
      {categories.map((cat) => {
        const catItems = itemsByCategory.get(cat.id) ?? [];
        if (catItems.length === 0) return null;
        return (
          <section key={cat.id}>
            <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">
              {cat.name}
            </h2>
            <ul className="space-y-2.5">{catItems.map(renderItem)}</ul>
          </section>
        );
      })}

      {uncategorised.length > 0 && (
        <section>
          <ul className="space-y-2.5">{uncategorised.map(renderItem)}</ul>
        </section>
      )}

      {/* Quantità, note e "Ordina" compaiono solo dopo il primo piatto: una
          scelta giusta, perché a carrello vuoto sarebbero comandi spenti. Ma
          a schermo vuoto la pagina sembrava una carta da leggere e basta, e
          chi non tocca il + non scopre mai che si ordina da qui. */}
      {lines.length === 0 && items.length > 0 && (
        <p className="sticky bottom-3 z-20 mx-auto max-w-2xl rounded-full border border-accent bg-surface/95 px-4 py-3 text-center text-sm shadow-lg backdrop-blur">
          Tocca <strong className="text-accent">+</strong> per ordinare dal
          tavolo. Poi potrai cambiare le quantità e aggiungere una nota per la
          cucina.
        </p>
      )}

      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Il menu non è ancora disponibile. Chiedi al personale.
        </p>
      )}

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <span className="text-sm">
              <strong className="tabular-nums">
                {lines.reduce((n, l) => n + l.quantity, 0)}
              </strong>{" "}
              articoli
              <span className="block font-semibold tabular-nums">
                {formatPriceCents(totalCents, currency)}
              </span>
            </span>
            <button
              type="button"
              onClick={submitOrder}
              disabled={submitting}
              className="min-h-12 rounded-full bg-accent px-7 font-medium text-accent-foreground active:scale-95 disabled:opacity-50"
            >
              {submitting ? "Invio..." : "Ordina"}
            </button>
          </div>
          {error && <p className="mx-auto mt-2 max-w-2xl text-sm text-danger">{error}</p>}
        </div>
      )}

      {openDish && (
        <DishSheet
          dish={openDish}
          currency={currency}
          pairing={items.find((i) => i.id === openDish.pairing_item_id) ?? null}
          inCartQuantity={cart[chiaveRiga(openDish.id, [])]?.quantity ?? 0}
          onAdd={(opzioni, prezzo, etichetta) =>
            addItem(openDish, opzioni, prezzo, etichetta)
          }
          onAddPairing={() => {
            const p = items.find((i) => i.id === openDish.pairing_item_id);
            if (p) addItem(p);
          }}
          onClose={() => setOpenDish(null)}
        />
      )}

      {submitted && (
        <p
          role="status"
          className="fixed inset-x-0 top-0 z-30 bg-success p-3 text-center text-sm font-medium text-white"
        >
          Ordine inviato in cucina.
        </p>
      )}
    </div>
  );
}
