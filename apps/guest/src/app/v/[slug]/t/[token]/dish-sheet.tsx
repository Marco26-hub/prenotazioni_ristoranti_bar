"use client";

import { useEffect } from "react";
import { formatPriceCents } from "@repo/shared";

export interface DishDetail {
  id: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  price_cents: number;
  image_url: string | null;
  allergens: string[] | null;
  dietary_tags: string[] | null;
  pairing_item_id: string | null;
}

const DIETARY_LABEL: Record<string, string> = {
  vegetariano: "Vegetariano",
  vegano: "Vegano",
  senza_glutine: "Senza glutine",
  senza_lattosio: "Senza lattosio",
  piccante: "Piccante",
};

/**
 * Scheda del piatto. Gli allergeni sono un obbligo di legge (Reg. UE
 * 1169/2011): un menu digitale che non li riporta lascia il locale fuori
 * norma, quindi hanno una posizione propria e non finiscono confusi nella
 * descrizione.
 */
export function DishSheet({
  dish,
  currency,
  pairing,
  inCartQuantity,
  onAdd,
  onAddPairing,
  onClose,
}: {
  dish: DishDetail;
  currency: string;
  pairing: DishDetail | null;
  inCartQuantity: number;
  onAdd: () => void;
  onAddPairing: () => void;
  onClose: () => void;
}) {
  // Con la scheda aperta la pagina sotto non deve scorrere.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={dish.name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-surface pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="sticky top-0 flex justify-end bg-surface/95 p-2 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="h-11 w-11 rounded-full border border-border text-lg leading-none"
          >
            ×
          </button>
        </div>

        {dish.image_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={dish.image_url} alt="" className="h-48 w-full object-cover" />
        )}

        <div className="space-y-4 px-5 pt-4">
          <div>
            <h2 className="text-xl font-semibold leading-snug">{dish.name}</h2>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatPriceCents(dish.price_cents, currency)}
            </p>
          </div>

          {dish.dietary_tags && dish.dietary_tags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {dish.dietary_tags.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-accent px-3 py-1 text-xs font-medium"
                >
                  {DIETARY_LABEL[t] ?? t}
                </li>
              ))}
            </ul>
          )}

          {dish.description && <p className="leading-relaxed">{dish.description}</p>}

          {dish.ingredients && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Ingredienti
              </h3>
              <p className="mt-1 leading-relaxed">{dish.ingredients}</p>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Allergeni
            </h3>
            {dish.allergens && dish.allergens.length > 0 ? (
              <p className="mt-1">{dish.allergens.join(", ")}</p>
            ) : (
              <p className="mt-1 text-muted">
                Nessuno segnalato. Per intolleranze o allergie chiedi al personale.
              </p>
            )}
          </div>

          {pairing && (
            <div className="rounded-xl border border-border p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Si abbina bene con
              </h3>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{pairing.name}</p>
                  <p className="text-sm tabular-nums text-muted">
                    {formatPriceCents(pairing.price_cents, currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onAddPairing}
                  className="min-h-11 shrink-0 rounded-full border border-accent px-4 text-sm font-medium"
                >
                  Aggiungi
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onAdd}
            className="min-h-12 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95"
          >
            {inCartQuantity > 0
              ? `Aggiungi ancora (${inCartQuantity} nel carrello)`
              : "Aggiungi al carrello"}
          </button>
        </div>
      </div>
    </div>
  );
}
