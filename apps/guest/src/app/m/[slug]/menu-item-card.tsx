"use client";

import { useEffect, useState } from "react";
import { formatPriceCents } from "@repo/shared";
import {
  descriviBevanda,
  CONSERVAZIONE_ETICHETTA,
  type Conservazione,
} from "@repo/shared/bevande";

const DIETA: Record<string, string> = {
  vegetariano: "Vegetariano",
  vegano: "Vegano",
  senza_glutine: "Senza glutine",
  senza_lattosio: "Senza lattosio",
  piccante: "Piccante",
};

export interface DettaglioVoce {
  name: string;
  description: string | null;
  ingredients: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  allergens: string[] | null;
  dietaryTags: string[] | null;
  conservation: Conservazione;
  originNote: string | null;
  kind: string;
  producer: string | null;
  vintage: number | null;
  denomination: string | null;
  origin: string | null;
  abv: string | null;
  servingNote: string | null;
}

/**
 * Scheda del piatto sul menu pubblico.
 *
 * Allergeni, ingredienti e stato di conservazione non sono un di più: gli
 * allergeni sono obbligatori (Reg. UE 1169/2011, sanzione da 3.000 a 24.000
 * € con il D.Lgs. 231/2017) e il congelato va dichiarato, pena la frode in
 * commercio. Un menu digitale che li omette mette il locale fuori norma
 * esattamente come una carta stampata senza.
 */
export function MenuItemCard({
  name,
  description,
  ingredients,
  priceCents,
  currency,
  imageUrl,
  allergens,
  dietaryTags,
  conservation,
  originNote,
  kind,
  producer,
  vintage,
  denomination,
  origin,
  abv,
  servingNote,
}: DettaglioVoce) {
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
            <span className="block font-semibold leading-snug text-pretty">
              {name}
              {conservation !== "fresco" && (
                <span
                  aria-hidden
                  className="ml-0.5 align-super text-xs text-muted"
                >
                  *
                </span>
              )}
            </span>
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
                <h2 className="text-xl font-semibold text-pretty">
                  {name}
                  {conservation !== "fresco" && (
                    <span aria-hidden className="ml-0.5 align-super text-sm text-muted">
                      *
                    </span>
                  )}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Chiudi dettagli"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-xl leading-none hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  ×
                </button>
              </div>
              {kind !== "food" &&
                descriviBevanda({
                  producer,
                  vintage,
                  denomination,
                  origin,
                  abv,
                  serving_note: servingNote,
                }) && (
                  <p className="text-sm text-muted">
                    {descriviBevanda({
                      producer,
                      vintage,
                      denomination,
                      origin,
                      abv,
                      serving_note: servingNote,
                    })}
                  </p>
                )}

              <p className="text-lg font-semibold tabular-nums">
                {formatPriceCents(priceCents, currency)}
              </p>

              {dietaryTags && dietaryTags.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {dietaryTags.map((t) => (
                    <li
                      key={t}
                      className="rounded-full border border-accent px-3 py-1 text-xs font-medium"
                    >
                      {DIETA[t] ?? t}
                    </li>
                  ))}
                </ul>
              )}

              {description && <p className="leading-relaxed text-muted">{description}</p>}

              {ingredients && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Ingredienti
                  </h3>
                  <p className="mt-1 leading-relaxed">{ingredients}</p>
                </div>
              )}

              {/* Sezione propria e non mescolata alla descrizione: chi ha
                  un'allergia deve trovarla dove si aspetta di trovarla. */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Allergeni
                </h3>
                {allergens && allergens.length > 0 ? (
                  <p className="mt-1">{allergens.join(", ")}</p>
                ) : (
                  <p className="mt-1 text-muted">
                    Nessuno segnalato. Per allergie e intolleranze chiedi sempre
                    al personale prima di ordinare.
                  </p>
                )}
              </div>

              {conservation !== "fresco" && (
                <p className="rounded-lg border border-border bg-background p-3 text-sm">
                  <strong className="font-medium">
                    * {CONSERVAZIONE_ETICHETTA[conservation]}.
                  </strong>{" "}
                  {conservation === "abbattuto"
                    ? "Sottoposto ad abbattimento rapido di temperatura come previsto dal Reg. CE 853/2004."
                    : "Prodotto non fresco, utilizzato in assenza di reperibilità del prodotto fresco."}
                </p>
              )}

              {originNote && (
                <p className="text-sm text-muted">Origine: {originNote}</p>
              )}

              {servingNote && kind !== "food" && (
                <p className="text-sm text-muted">Servizio: {servingNote}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
