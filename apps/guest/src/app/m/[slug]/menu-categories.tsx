"use client";

import { useState } from "react";
import { MenuItemCard, type DettaglioVoce } from "./menu-item-card";

/**
 * La voce porta con sé tutto ciò che la scheda mostra: allergeni,
 * ingredienti e conservazione sono obbligatori per legge, quindi passano di
 * qui insieme al nome invece di essere caricati a parte.
 */
type CategoryItem = Omit<DettaglioVoce, "currency"> & { id: string };

interface Category {
  id: string;
  name: string;
  items: CategoryItem[];
}

export function MenuCategories({
  categories,
  currency,
}: {
  categories: Category[];
  currency: string;
}) {
  const [selected, setSelected] = useState("all");
  const visible =
    selected === "all"
      ? categories
      : categories.filter((category) => category.id === selected);

  return (
    <>
      <nav
        className="menu-category-nav sticky top-0 z-20 border-b border-border"
        aria-label="Filtra il menu per categoria"
      >
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setSelected("all")}
            aria-pressed={selected === "all"}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
              selected === "all"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-surface"
            }`}
          >
            Tutti
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelected(category.id)}
              aria-pressed={selected === category.id}
              className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
                selected === category.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-surface"
              }`}
            >
              {category.name}
            </button>
          ))}
          <a
            href="#informazioni"
            className="flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm text-muted hover:bg-surface"
          >
            Info
          </a>
        </div>
      </nav>

      <main
        id="menu"
        className="mx-auto w-full max-w-5xl flex-1 space-y-12 px-4 py-9 sm:px-6 sm:py-12"
      >
        {visible.map((category) => (
          <section key={category.id} aria-labelledby={`categoria-${category.id}`}>
            <div className="mb-4 flex items-center gap-4">
              <h2
                id={`categoria-${category.id}`}
                className="menu-section-title shrink-0 font-semibold text-pretty"
              >
                {category.name}
              </h2>
              <span className="menu-section-rule h-px flex-1" aria-hidden="true" />
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {category.items.map((item) => (
                <MenuItemCard key={item.id} {...item} currency={currency} />
              ))}
            </ul>
          </section>
        ))}

        {categories.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
            Il menu non è ancora pubblicato.
          </p>
        )}
      </main>
    </>
  );
}
