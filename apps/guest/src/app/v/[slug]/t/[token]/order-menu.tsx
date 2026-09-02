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
        const { [itemId]: _removed, ...rest } = prev;
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

  return (
    <div className="space-y-8 pb-32">
      {categories.map((cat) => {
        const catItems = itemsByCategory.get(cat.id) ?? [];
        if (catItems.length === 0) return null;
        return (
          <section key={cat.id}>
            <h2 className="mb-2 text-lg font-medium">{cat.name}</h2>
            <ul className="space-y-2">
              {catItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-500">{item.description}</p>
                    )}
                    <p className="text-sm">{formatPriceCents(item.price_cents, currency)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cart[item.id] && (
                      <>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 rounded border"
                        >
                          −
                        </button>
                        <span>{cart[item.id].quantity}</span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => addItem(item)}
                      className="h-8 w-8 rounded border"
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {itemsByCategory.get(null)?.length ? (
        <section>
          <ul className="space-y-2">
            {itemsByCategory.get(null)!.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm">{formatPriceCents(item.price_cents, currency)}</p>
                </div>
                <button type="button" onClick={() => addItem(item)} className="h-8 w-8 rounded border">
                  +
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-white p-4">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <span>
              {lines.reduce((n, l) => n + l.quantity, 0)} articoli —{" "}
              {formatPriceCents(totalCents, currency)}
            </span>
            <button
              type="button"
              onClick={submitOrder}
              disabled={submitting}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {submitting ? "Invio..." : "Ordina"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {submitted && (
        <p className="fixed inset-x-0 top-0 bg-green-600 p-2 text-center text-white">
          Ordine inviato in cucina.
        </p>
      )}
    </div>
  );
}
