"use client";

import { useActionState } from "react";
import { saveDishPhoto, type PhotoResult } from "./photo-actions";

export function PhotoForm({
  itemId,
  imageUrl,
}: {
  itemId: string;
  imageUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState<PhotoResult | null, FormData>(
    async (_prev, formData) => saveDishPhoto(formData),
    null
  );

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="itemId" value={itemId} />

      {imageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
          <label className="flex items-center gap-1 text-xs text-muted">
            <input type="checkbox" name="removePhoto" />
            Rimuovi
          </label>
        </>
      )}

      <input
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="max-w-[11rem] text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-9 rounded-full border border-border px-3 text-xs disabled:opacity-50"
      >
        {pending ? "..." : imageUrl ? "Aggiorna foto" : "Carica foto"}
      </button>

      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}
