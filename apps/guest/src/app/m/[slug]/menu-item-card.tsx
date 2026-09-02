"use client";

import { useEffect, useState } from "react";
import { formatPriceCents } from "@repo/shared";

export function MenuItemCard({
  name,
  description,
  priceCents,
  currency,
  imageUrl,
}: {
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Apri dettagli di ${name}`}
        className="group flex min-h-32 w-full items-stretch gap-3 rounded-xl border border-border bg-surface p-3 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        {imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt=""
            width={112}
            height={112}
            loading="lazy"
            className="h-28 w-28 shrink-0 rounded-lg object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-medium leading-snug">{name}</span>
          {description && (
            <span className="mt-0.5 block line-clamp-3 text-sm leading-snug text-muted">
              {description}
            </span>
          )}
        </span>
        <span className="shrink-0 self-start pt-0.5 font-semibold tabular-nums">
          {formatPriceCents(priceCents, currency)}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={name}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
          >
            {imageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={imageUrl} alt={name} width={720} height={480} className="max-h-[55vh] w-full object-cover" />
            )}
            <div className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-semibold text-pretty">{name}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Chiudi dettagli"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-xl leading-none hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  ×
                </button>
              </div>
              <p className="text-lg font-semibold tabular-nums">{formatPriceCents(priceCents, currency)}</p>
              {description && <p className="leading-relaxed text-muted">{description}</p>}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
