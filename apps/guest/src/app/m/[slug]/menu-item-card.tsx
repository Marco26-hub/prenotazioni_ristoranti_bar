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
        className={`menu-card group grid min-h-36 w-full gap-4 rounded-lg border p-3 text-left transition-[border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${imageUrl ? "grid-cols-[7rem_minmax(0,1fr)] sm:grid-cols-[8.5rem_minmax(0,1fr)]" : "grid-cols-1"}`}
      >
        {imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt=""
            width={112}
            height={112}
            loading="lazy"
            className="menu-photo h-28 w-full rounded-md object-cover transition-transform duration-200 group-hover:scale-[1.015] sm:h-36"
          />
        )}
        <span className="flex min-w-0 flex-col py-1">
          <span className="flex items-start justify-between gap-3">
            <span className="block font-semibold leading-snug text-pretty">{name}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {formatPriceCents(priceCents, currency)}
            </span>
          </span>
          {description && (
            <span className="mt-2 block line-clamp-4 text-sm leading-relaxed text-muted">
              {description}
            </span>
          )}
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
