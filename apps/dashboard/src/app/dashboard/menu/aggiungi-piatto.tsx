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
        className="flex min-h-11 w-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted hover:border-accent hover:text-foreground"
      >
        + Aggiungi piatto in {categoryName}
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
      className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3"
    >
      {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}

      <input
        ref={nomeRef}
        name="name"
        placeholder={`Nome del piatto`}
        required
        className="min-h-11 w-full min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm sm:w-auto"
      />
      <input
        name="price"
        type="number"
        step="0.01"
        min="0"
        placeholder="€"
        required
        aria-label="Prezzo"
        className="min-h-11 w-24 rounded-lg border border-border bg-background px-3 text-sm"
      />
      <button
        type="submit"
        className="min-h-11 flex-1 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground sm:flex-none"
      >
        Aggiungi
      </button>
      <button
        type="button"
        onClick={() => setAperto(false)}
        className="flex min-h-11 items-center px-3 text-sm text-muted underline"
      >
        Chiudi
      </button>

      <p className="w-full text-xs text-muted">
        Descrizione, allergeni e foto si aggiungono poi da <em>Modifica</em>.
        Il campo resta aperto: puoi inserirne uno dopo l&apos;altro.
      </p>
    </form>
  );
}
