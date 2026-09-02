"use client";

import { useActionState, useId } from "react";
import { saveDishPhoto, type PhotoResult } from "./photo-actions";

/**
 * Caricamento della foto del piatto.
 *
 * L'input file nativo mostra un nome troncato illeggibile ("Scegli file
 * Ness…onato") e non dice quanto pesa il limite. Qui è nascosto dietro
 * un'etichetta cliccabile: si vede la foto, non il widget del browser.
 */
export function PhotoForm({
  itemId,
  imageUrl,
}: {
  itemId: string;
  imageUrl: string | null;
}) {
  const inputId = useId();
  const [state, formAction, pending] = useActionState<PhotoResult | null, FormData>(
    async (_prev, formData) => saveDishPhoto(formData),
    null
  );

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="itemId" value={itemId} />

      {imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageUrl}
          alt=""
          className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-lg text-muted"
        >
          ▦
        </div>
      )}

      <div className="min-w-0 flex-1">
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border px-4 text-sm"
        >
          {imageUrl ? "Cambia foto" : "Aggiungi foto"}
        </label>
        <input
          id={inputId}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          // Il form si invia da sé alla scelta del file: due passaggi per
          // caricare una foto, moltiplicati per l'intero menu, sono un
          // pomeriggio buttato.
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />

        <p className="mt-1 text-xs text-muted">
          {pending ? "Caricamento…" : "JPG, PNG o WEBP fino a 300 KB"}
        </p>

        {state?.error && <p className="mt-1 text-xs text-danger">{state.error}</p>}
      </div>

      {imageUrl && (
        <button
          type="submit"
          name="removePhoto"
          value="on"
          disabled={pending}
          className="flex min-h-11 shrink-0 items-center px-2 text-sm text-danger underline disabled:opacity-50"
        >
          Rimuovi
        </button>
      )}
    </form>
  );
}
