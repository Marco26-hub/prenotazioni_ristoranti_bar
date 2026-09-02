"use client";

import { useActionState } from "react";
import { saveBranding, type BrandResult } from "./brand-actions";

export function BrandForm({
  defaults,
}: {
  defaults: {
    name: string;
    logoUrl: string | null;
    brandColor: string | null;
    publicPhone: string | null;
    publicEmail: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState<BrandResult | null, FormData>(
    async (_prev, formData) => saveBranding(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm">Nome mostrato ai clienti</label>
        <input
          name="displayName"
          defaultValue={defaults.name}
          required
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm">Logo</label>
        {defaults.logoUrl && (
          <div className="mb-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={defaults.logoUrl}
              alt="Logo attuale"
              className="h-12 w-12 rounded-lg object-contain"
            />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="removeLogo" />
              Rimuovi
            </label>
          </div>
        )}
        <input
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="w-full text-sm"
        />
        <p className="mt-1 text-xs text-muted">PNG, JPG, WEBP o SVG, massimo 200 KB.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm">Colore principale</label>
        <input
          name="brandColor"
          type="color"
          defaultValue={defaults.brandColor ?? "#b4451f"}
          className="h-11 w-20 rounded-lg border border-border bg-background"
        />
        <p className="mt-1 text-xs text-muted">
          Usato per pulsanti ed evidenziazioni nella pagina che vedono i clienti.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm">Telefono pubblico</label>
        <input
          name="publicPhone"
          defaultValue={defaults.publicPhone ?? ""}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm">Email pubblica</label>
        <input
          name="publicEmail"
          type="email"
          defaultValue={defaults.publicEmail ?? ""}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
        />
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">Personalizzazione salvata.</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-50"
      >
        {pending ? "Salvataggio..." : "Salva personalizzazione"}
      </button>
    </form>
  );
}
