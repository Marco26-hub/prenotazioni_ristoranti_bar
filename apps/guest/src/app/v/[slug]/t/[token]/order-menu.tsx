"use client";

import { useMemo, useState } from "react";
import { formatPriceCents } from "@repo/shared";

interface MenuCategory {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  allergens: string[] | null;
}

interface CartLine {
  menuItemId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
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

  const addItem = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: {
          menuItemId: item.id,
          name: item.name,
          unitPriceCents: item.price_cents,
          quantity: (existing?.quantity ?? 0) + 1,
        },
      };
    });
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const rest = { ...prev };
        delete rest[itemId];
        return rest;
      }
      return { ...prev, [itemId]: { ...existing, quantity: existing.quantity - 1 } };
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
          items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Errore invio ordine");
      }
      setCart({});
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore invio ordine");
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = (item: MenuItem) => {
    const inCart = cart[item.id];
    return (
      <li
        key={item.id}
        className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{item.name}</p>
          {item.description && (
            <p className="mt-0.5 text-sm leading-snug text-muted">{item.description}</p>
          )}
          <p className="mt-1.5 font-semibold tabular-nums">
            {formatPriceCents(item.price_cents, currency)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {inCart && (
            <>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
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
            onClick={() => addItem(item)}
            aria-label={`Aggiungi ${item.name}`}
            className="h-11 w-11 rounded-full bg-accent text-xl leading-none text-accent-foreground active:scale-95"
          >
            +
          </button>
        </div>
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
