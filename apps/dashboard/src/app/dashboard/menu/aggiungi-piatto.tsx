"use client";

import { useRef, useState } from "react";
import { addMenuItem } from "./actions";

/**
 * Aggiunta rapida di un piatto, in coda alla categoria in cui si sta
 * lavorando.
 *
 * Prima esisteva un solo modulo in fondo alla pagina, sotto le sezioni di
 * importazione: per aggiungere tre antipasti si scorreva tutto il menu tre
 * volte e si sceglieva ogni volta la categoria da un elenco. Qui la
 * categoria è già quella giusta e il campo resta pronto per il prossimo.
 */
export function AggiungiPiatto({
  categoryId,
  categoryName,
}: {
  categoryId: string | null;
  categoryName: string;
}) {
  const [aperto, setAperto] = useState(false);
  const nomeRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => {
          setAperto(true);
          // Il focus va sul nome: chi ha appena cliccato "aggiungi" vuole
          // scrivere, non cercare il campo.
          requestAnimationFrame(() => nomeRef.current?.focus());
        }}
        className="flex min-h-12 w-full items-center justify-center rounded-lg border border-dashed border-accent bg-accent/5 px-4 text-sm font-medium text-foreground hover:bg-accent/10"
      >
        + Nuovo piatto o bevanda in {categoryName}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addMenuItem(formData);
        formRef.current?.reset();
        nomeRef.current?.focus();
      }}
      className="rounded-lg border border-accent bg-surface p-4"
    >
      {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Nuova voce</h3>
          <p className="text-xs text-muted">Categoria: {categoryName}</p>
        </div>
        <button
          type="button"
          onClick={() => setAperto(false)}
          className="min-h-10 px-2 text-sm text-muted underline underline-offset-4"
        >
          Annulla
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
        <label className="text-xs font-medium text-muted">
          Nome
          <input
            ref={nomeRef}
            name="name"
            placeholder="Es. Acqua naturale 0,75 L"
            required
            className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Prezzo (€)
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            required
            className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-accent px-5 text-sm font-medium text-accent-foreground"
        >
          Crea voce
        </button>
      </div>

      <p className="mt-3 text-xs text-muted">
        Dopo la creazione usa “Modifica” per foto, descrizione, allergeni e varianti.
      </p>
    </form>
  );
}
