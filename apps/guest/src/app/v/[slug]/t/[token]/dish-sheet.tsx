"use client";

import { useEffect, useState } from "react";
import { descriviBevanda, type Conservazione } from "@repo/shared/bevande";
import { ALLERGENI } from "@repo/shared/allergeni";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tComune, type VociComuni } from "@repo/shared/i18n/comune";
import { tTavolo } from "@/i18n/tavolo";

export interface OpzioneCliente {
  id: string;
  name: string;
  price_delta_cents: number;
  available: boolean;
}

export interface GruppoCliente {
  id: string;
  name: string;
  kind?: "scelta" | "aggiunta" | "rimozione";
  required: boolean;
  min_choices: number;
  max_choices: number;
  opzioni: OpzioneCliente[];
}

export interface DishDetail {
  id: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  price_cents: number;
  ha_foto: boolean;
  allergens: string[] | null;
  dietary_tags: string[] | null;
  pairing_item_id: string | null;
  gruppi?: GruppoCliente[];
  conservation?: Conservazione;
  origin_note?: string | null;
  kind?: string;
  producer?: string | null;
  vintage?: number | null;
  denomination?: string | null;
  origin?: string | null;
  abv?: string | null;
  serving_note?: string | null;
}

type ChiaveComune = Extract<keyof VociComuni, string>;

/*
 * Diciture e allergeni li traduce comune.ts, non questa scheda.
 *
 * Sono le stesse parole del menu pubblico e della carta stampata, e un
 * allergene scritto in due modi diversi è un allergene di cui il cliente non
 * si fida. Qui restano solo gli insiemi dei valori che comune.ts conosce: un
 * valore fuori elenco — un menu importato da CSV ne ha — si mostra com'è,
 * perché cancellarlo sarebbe peggio che mostrarlo in italiano.
 */
const DICITURE_TRADOTTE = new Set([
  "vegetariano",
  "vegano",
  "senza_glutine",
  "senza_lattosio",
  "piccante",
]);

const ALLERGENI_TRADOTTI = new Set(ALLERGENI.map((a) => a.chiave));

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
  quantitaPerOpzioni,
  onAdd,
  onAddPairing,
  onClose,
  aFormula = false,
}: {
  dish: DishDetail;
  currency: string;
  pairing: DishDetail | null;
  /** Quante ce ne sono già nel carrello con ESATTAMENTE queste opzioni. */
  quantitaPerOpzioni: (opzioni: string[]) => number;
  onAdd: (opzioni: string[], prezzoUnitario: number, etichetta: string | null) => void;
  onAddPairing: () => void;
  onClose: () => void;
  /** Voce compresa in una formula a prezzo fisso: il prezzo non si paga. */
  aFormula?: boolean;
}) {
  const lingua = useLingua();
  const t = tTavolo(lingua);
  const tc = tComune(lingua);
  const gruppi = dish.gruppi ?? [];
  const [scelte, setScelte] = useState<Record<string, string[]>>({});
  const [errore, setErrore] = useState<string | null>(null);

  function commuta(g: GruppoCliente, opzioneId: string) {
    setErrore(null);
    setScelte((prev) => {
      const attuali = prev[g.id] ?? [];
      if (g.max_choices === 1) {
        // Scelta singola: selezionare la seconda sostituisce la prima, non
        // la affianca. È come si comporta un gruppo di radio.
        return { ...prev, [g.id]: attuali.includes(opzioneId) ? [] : [opzioneId] };
      }
      if (attuali.includes(opzioneId)) {
        return { ...prev, [g.id]: attuali.filter((x) => x !== opzioneId) };
      }
      if (attuali.length >= g.max_choices) return prev;
      return { ...prev, [g.id]: [...attuali, opzioneId] };
    });
  }

  const idScelti = Object.values(scelte).flat();
  const giaNelCarrello = quantitaPerOpzioni(idScelti);

  /*
   * Cosa manca ancora, se manca qualcosa.
   *
   * Il bottone restava verde, a prezzo pieno, come se fosse pronto: premendolo
   * compariva un rigo rosso sopra — facile da non vedere — e per il cliente
   * "non lo prende". Adesso il bottone dice lui stesso cosa scegliere, e non
   * finge di poter fare una cosa che rifiutera.
   */
  const gruppoMancante = gruppi.find((g) => {
    const n = (scelte[g.id] ?? []).length;
    return (g.required && n === 0) || n < g.min_choices;
  });
  const supplementi = gruppi
    .flatMap((g) => g.opzioni)
    .filter((o) => idScelti.includes(o.id))
    .reduce((s, o) => s + o.price_delta_cents, 0);
  const prezzoUnitario = dish.price_cents + supplementi;

  const etichetta =
    gruppi
      .flatMap((g) => g.opzioni)
      .filter((o) => idScelti.includes(o.id))
      .map((o) => {
        const g = gruppi.find((x) => x.opzioni.some((y) => y.id === o.id));
        return g?.kind === "rimozione"
          ? t("varianti.senza", { nome: o.name.toLowerCase() })
          : o.name;
      })
      .join(" · ") || null;

  function aggiungi() {
    // La stessa verifica gira anche sul server: qui serve a dirlo subito,
    // là a impedirlo davvero.
    for (const g of gruppi) {
      const n = (scelte[g.id] ?? []).length;
      if (g.required && n === 0) {
        setErrore(t("varianti.scegli", { gruppo: g.name.toLowerCase() }));
        return;
      }
      if (n < g.min_choices) {
        setErrore(
          t("varianti.minimo", {
            gruppo: g.name.toLowerCase(),
            n: g.min_choices,
          })
        );
        return;
      }
    }
    onAdd(idScelti, prezzoUnitario, etichetta);
    // Si chiude: restando aperta, la scheda copre il carrello e la barra del
    // totale, quindi premere "aggiungi" non produceva nulla di visibile ed
    // era indistinguibile da un bottone rotto.
    onClose();
  }

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
            aria-label={tc("azione.chiudi")}
            className="h-11 w-11 rounded-full border border-border text-lg leading-none"
          >
            ×
          </button>
        </div>

        {dish.ha_foto && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/foto/${dish.id}`}
            alt=""
            loading="lazy"
            className="h-48 w-full object-cover"
          />
        )}

        <div className="space-y-4 px-5 pt-4">
          <div>
            <h2 className="text-xl font-semibold leading-snug">{dish.name}</h2>
            {dish.kind && dish.kind !== "food" &&
              descriviBevanda({
                producer: dish.producer ?? null,
                vintage: dish.vintage ?? null,
                denomination: dish.denomination ?? null,
                origin: dish.origin ?? null,
                abv: dish.abv ?? null,
                serving_note: dish.serving_note ?? null,
              }) && (
                <p className="mt-1 text-sm text-muted">
                  {descriviBevanda({
                    producer: dish.producer ?? null,
                    vintage: dish.vintage ?? null,
                    denomination: dish.denomination ?? null,
                    origin: dish.origin ?? null,
                    abv: dish.abv ?? null,
                    serving_note: dish.serving_note ?? null,
                  })}
                </p>
              )}
            {/* A formula il prezzo di una voce compresa non si paga:
                mostrarlo contraddice il menu, che dice "compreso". */}
            {aFormula ? (
              <p className="mt-1 text-sm font-medium text-success">
                {t("formula.compreso")}
              </p>
            ) : (
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {t.prezzo(dish.price_cents, currency)}
              </p>
            )}
            {dish.conservation && dish.conservation !== "fresco" && (
              <p className="mt-1 text-sm text-muted">
                * {tc(`conservazione.${dish.conservation}`).toLowerCase()}
              </p>
            )}
            {dish.origin_note && (
              <p className="mt-0.5 text-sm text-muted">
                {t("piatto.origine", { nota: dish.origin_note })}
              </p>
            )}
          </div>

          {dish.dietary_tags && dish.dietary_tags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {dish.dietary_tags.map((dicitura) => (
                <li
                  key={dicitura}
                  className="rounded-full border border-accent px-3 py-1 text-xs font-medium"
                >
                  {DICITURE_TRADOTTE.has(dicitura)
                    ? tc(`dicitura.${dicitura}` as ChiaveComune)
                    : dicitura}
                </li>
              ))}
            </ul>
          )}

          {dish.description && <p className="leading-relaxed">{dish.description}</p>}

          {dish.ingredients && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t("piatto.ingredienti")}
              </h3>
              <p className="mt-1 leading-relaxed">{dish.ingredients}</p>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {tc("allergeni.titolo")}
            </h3>
            {dish.allergens && dish.allergens.length > 0 ? (
              <p className="mt-1">
                {dish.allergens
                  .map((a) =>
                    ALLERGENI_TRADOTTI.has(a)
                      ? tc(`allergene.${a}` as ChiaveComune)
                      : a
                  )
                  .join(", ")}
              </p>
            ) : (
              <p className="mt-1 text-muted">{t("allergeni.nessuno")}</p>
            )}
          </div>

          {gruppi.map((g) => (
            <div key={g.id}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                {g.name}
                {g.required && (
                  <span className="ml-1 text-accent">{t("varianti.obbligatorio")}</span>
                )}
                {g.max_choices > 1 && (
                  <span className="ml-1 font-normal normal-case">
                    {t("varianti.finoa", { n: g.max_choices })}
                  </span>
                )}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {g.opzioni.map((o) => {
                  const scelta = (scelte[g.id] ?? []).includes(o.id);
                  return (
                    <li key={o.id}>
                      <button
                        type="button"
                        disabled={!o.available}
                        onClick={() => commuta(g, o.id)}
                        aria-pressed={scelta}
                        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 text-left disabled:opacity-40 ${
                          scelta ? "border-accent bg-accent/10" : "border-border"
                        }`}
                      >
                        <span>
                          {g.kind === "rimozione"
                            ? t("varianti.senza", { nome: o.name.toLowerCase() })
                            : o.name}
                          {!o.available && (
                            <span className="ml-2 text-xs text-muted">
                              {t("varianti.esaurito")}
                            </span>
                          )}
                        </span>
                        {o.price_delta_cents !== 0 && (
                          <span className="shrink-0 text-sm tabular-nums text-muted">
                            {o.price_delta_cents > 0 ? "+" : "−"}
                            {t.prezzo(Math.abs(o.price_delta_cents), currency)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {pairing && (
            <div className="rounded-xl border border-border p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t("abbinamento.titolo")}
              </h3>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{pairing.name}</p>
                  <p className="text-sm tabular-nums text-muted">
                    {t.prezzo(pairing.price_cents, currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onAddPairing}
                  className="min-h-11 shrink-0 rounded-full border border-accent px-4 text-sm font-medium"
                >
                  {tc("azione.aggiungi")}
                </button>
              </div>
            </div>
          )}

          {errore && (
            <p role="alert" className="text-sm font-medium text-danger">
              {errore}
            </p>
          )}

          <button
            type="button"
            onClick={aggiungi}
            disabled={Boolean(gruppoMancante)}
            className={`flex min-h-12 w-full items-center justify-between rounded-full px-5 font-medium active:scale-95 ${
              gruppoMancante
                ? "cursor-not-allowed border border-border bg-background text-muted"
                : "bg-accent text-accent-foreground"
            }`}
          >
            <span>
              {gruppoMancante
                ? t("varianti.continua", {
                    gruppo: gruppoMancante.name.toLowerCase(),
                  })
                : giaNelCarrello > 0
                  ? t("aggiungi.ancora", { n: giaNelCarrello })
                  : t("aggiungi.carrello")}
            </span>
            {!gruppoMancante && !aFormula && (
              <span className="tabular-nums">
                {t.prezzo(prezzoUnitario, currency)}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
