"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPriceCents } from "@repo/shared";
import { DishSheet, type DishDetail } from "./dish-sheet";

interface MenuCategory {
  id: string;
  name: string;
}

interface MenuItem extends DishDetail {
  category_id: string | null;
  /** Si paga a parte anche al tavolo che ha preso la formula. */
  fuori_formula?: boolean;
}

interface CartLine {
  menuItemId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes?: string;
  optionIds: string[];
  /** "12 pezzi · Avocado", per mostrare al cliente cosa ha scelto. */
  optionsLabel: string | null;
}

/**
 * Chiave della riga di carrello.
 *
 * Lo stesso piatto con varianti diverse è una riga diversa: due sushi da 6
 * e uno da 12 non si sommano, hanno prezzo e comanda distinti.
 */
function chiaveRiga(itemId: string, optionIds: string[]): string {
  return optionIds.length === 0
    ? itemId
    : `${itemId}::${[...optionIds].sort().join(",")}`;
}

export function OrderMenu({
  sessionId,
  currency,
  categories,
  items,
  intervalloMin,
  aFormula,
}: {
  sessionId: string;
  currency: string;
  categories: MenuCategory[];
  items: MenuItem[];
  /** Minuti fra un'ordinazione e la successiva. 0 = nessuna attesa. */
  intervalloMin: number;
  /** Il tavolo paga a prezzo fisso: le voci fuori formula si pagano a parte. */
  aFormula: boolean;
}) {
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [openDish, setOpenDish] = useState<MenuItem | null>(null);
  const [riepilogoAperto, setRiepilogoAperto] = useState(false);
  const [notePerRiga, setNotePerRiga] = useState<string | null>(null);
  /** null = tutte le portate. */
  const [categoriaScelta, setCategoriaScelta] = useState<string | null>(null);
  const [cerca, setCerca] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /*
   * Secondi che mancano prima di poter ordinare di nuovo, se il locale ha
   * impostato un'attesa fra un'ordinazione e l'altra (il metodo degli
   * all-you-can-eat).
   *
   * Il numero arriva dal server e da lì scala. Non si calcola da un istante
   * letto sul telefono: l'orologio del telefono si può spostare, e
   * l'attesa vera la decide comunque il database — questa serve solo a non
   * far scoprire l'attesa premendo.
   */
  const [mancanoSecondi, setMancanoSecondi] = useState(0);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string | null, MenuItem[]>();
    for (const item of items) {
      const key = item.category_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  const addItem = (
    item: { id: string; name: string; price_cents: number },
    optionIds: string[] = [],
    unitPriceCents?: number,
    optionsLabel: string | null = null
  ) => {
    const chiave = chiaveRiga(item.id, optionIds);
    setCart((prev) => {
      const existing = prev[chiave];
      return {
        ...prev,
        [chiave]: {
          menuItemId: item.id,
          name: item.name,
          unitPriceCents: unitPriceCents ?? item.price_cents,
          quantity: (existing?.quantity ?? 0) + 1,
          // Senza questo la nota già scritta sparirebbe premendo "+".
          notes: existing?.notes,
          optionIds,
          optionsLabel,
        },
      };
    });
  };

  const removeItem = (chiave: string) => {
    setCart((prev) => {
      const existing = prev[chiave];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const rest = { ...prev };
        delete rest[chiave];
        return rest;
      }
      return { ...prev, [chiave]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  // La chiave viaggia con la riga: il pannello deve poter togliere e
  // annotare proprio quella combinazione, non il piatto in generale.
  const lines = Object.entries(cart).map(([chiave, riga]) => ({ ...riga, chiave }));
  /*
   * A formula il totale del carrello conta solo quello che si paga.
   *
   * Sommando anche le voci comprese diceva centottanta euro a un tavolo che
   * ne deve sessanta: il cliente lo legge mentre ordina e smette di ordinare.
   */
  const fuoriFormula = new Set(
    items.filter((i) => i.fuori_formula).map((i) => i.id)
  );
  const siPaga = (menuItemId: string) => !aFormula || fuoriFormula.has(menuItemId);

  const totalCents = lines.reduce(
    (sum, l) => sum + (siPaga(l.menuItemId) ? l.unitPriceCents * l.quantity : 0),
    0
  );

  /*
   * La conferma se ne va da sola dopo qualche secondo.
   *
   * Restando a schermo diventa arredamento: al secondo giro non si distingue
   * più dalla prima volta, e non si sa se l'ordine è partito davvero.
   */
  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => setSubmitted(false), 8000);
    return () => clearTimeout(t);
  }, [submitted]);

  useEffect(() => {
    if (mancanoSecondi <= 0) return;
    const t = setInterval(
      () => setMancanoSecondi((s) => (s > 0 ? s - 1 : 0)),
      1000
    );
    return () => clearInterval(t);
  }, [mancanoSecondi]);

  const inAttesa = mancanoSecondi > 0;

  const attesaTesto =
    mancanoSecondi >= 60
      ? `${Math.ceil(mancanoSecondi / 60)} min`
      : `${mancanoSecondi} s`;

  const submitOrder = async () => {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            notes: l.notes?.trim() || undefined,
            // Solo gli id: il prezzo lo ricalcola il server.
            optionIds: l.optionIds,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Attesa fra un'ordinazione e l'altra: il carrello non si svuota,
        // così fra due minuti basta premere di nuovo.
        if (res.status === 429 && typeof body.attesaSecondi === "number") {
          setMancanoSecondi(body.attesaSecondi);
        }
        throw new Error(body.error ?? "Errore invio ordine");
      }
      setMancanoSecondi(0);
      setCart({});
      setNoteFor(null);
      // L'attesa parte da qui: il server la conta dall'ultimo ordine, e il
      // bottone deve dirlo prima che qualcuno ci provi.
      if (intervalloMin > 0) setMancanoSecondi(intervalloMin * 60);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore invio ordine");
    } finally {
      setSubmitting(false);
    }
  };

  const setNote = (itemId: string, notes: string) => {
    setCart((prev) => (prev[itemId] ? { ...prev, [itemId]: { ...prev[itemId], notes } } : prev));
  };

  const renderItem = (item: MenuItem) => {
    const chiaveSemplice = chiaveRiga(item.id, []);
    const inCart = cart[chiaveSemplice];
    const haVarianti = (item.gruppi?.length ?? 0) > 0;


    return (
      <li
        key={item.id}
        className="rounded-xl border border-border bg-surface p-4"
      >
      <div className="flex items-start gap-3">
        {item.ha_foto && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/foto/${item.id}`}
            alt=""
            loading="lazy"
            onClick={() => setOpenDish(item)}
            className="h-20 w-20 shrink-0 cursor-pointer rounded-lg object-cover"
          />
        )}
        <button
          type="button"
          onClick={() => setOpenDish(item)}
          className="min-w-0 flex-1 text-left"
          aria-label={`Dettagli di ${item.name}`}
        >
          <p className="font-medium leading-snug">
            {item.name}
            {/* L'asterisco di legge anche qui, non solo nella scheda: un
                piatto senza varianti si aggiunge col "+" senza mai aprirla,
                e senza questo la nota in fondo alla pagina — "* prodotto
                surgelato…" — non si riferisce a niente. È l'omissione che il
                D.Lgs. 109/1992 sanziona. */}
            {item.conservation && item.conservation !== "fresco" && (
              <span aria-hidden className="ml-0.5 align-super text-xs text-muted">
                *
              </span>
            )}
          </p>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted">
              {item.description}
            </p>
          )}
          {/*
            A formula il prezzo di una voce compresa non vuol dire niente —
            mostrarlo fa credere che si paghi. Le voci fuori formula, invece,
            il prezzo ce l'hanno eccome, e va detto qui: un caffè che spunta
            sul conto senza che il menu l'avesse segnalato è la discussione
            che il cameriere si fa al momento di pagare.
          */}
          {aFormula && !item.fuori_formula ? (
            <p className="mt-1.5 text-sm font-medium text-success">
              Compreso nella formula
            </p>
          ) : (
            <p className="mt-1.5 font-semibold tabular-nums">
              {formatPriceCents(item.price_cents, currency)}
              {aFormula && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-xs font-medium text-amber-900">
                  fuori formula
                </span>
              )}
            </p>
          )}
          {haVarianti && (
            <p className="mt-1 text-xs text-accent underline underline-offset-2">
              {item.gruppi!.some((g) => g.required)
                ? "Da scegliere"
                : "Varianti e aggiunte"}
            </p>
          )}
          {(item.dietary_tags?.length || item.allergens?.length) && (
            <p className="mt-1 text-xs text-muted underline underline-offset-2">
              Allergeni e dettagli
            </p>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {inCart && (
            <>
              <button
                type="button"
                onClick={() => removeItem(chiaveSemplice)}
                aria-label={`Togli ${item.name}`}
                className="h-11 w-11 rounded-full border border-border text-xl leading-none active:scale-95"
              >
                −
              </button>
              <span className="w-5 text-center font-semibold tabular-nums">
                {inCart.quantity}
              </span>
            </>
          )}
          <button
            type="button"
            // Con varianti da scegliere il "+" non può decidere al posto del
            // cliente quale: apre la scheda, dove sceglie lui.
            onClick={() => (haVarianti ? setOpenDish(item) : addItem(item))}
            aria-label={`Aggiungi ${item.name}`}
            className="h-11 w-11 rounded-full bg-accent text-xl leading-none text-accent-foreground active:scale-95"
          >
            +
          </button>
        </div>
      </div>

      {inCart && (
        <div className="mt-3 border-t border-border pt-3">
          {noteFor === item.id || inCart.notes ? (
            <input
              value={inCart.notes ?? ""}
              onChange={(e) => setNote(chiaveSemplice, e.target.value)}
              placeholder="Es. senza cipolla, senza glutine"
              maxLength={140}
              autoFocus={noteFor === item.id && !inCart.notes}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => setNoteFor(item.id)}
              className="text-sm text-muted underline underline-offset-2"
            >
              Aggiungi una nota
            </button>
          )}
        </div>
      )}
      </li>
    );
  };

  const uncategorised = itemsByCategory.get(null) ?? [];

  // Solo le categorie che hanno davvero qualcosa: una linguetta "Dolci" che
  // apre il vuoto fa sembrare rotto il filtro.
  const categoriePiene = categories.filter(
    (c) => (itemsByCategory.get(c.id) ?? []).length > 0
  );

  const mostra = (id: string | null) =>
    categoriaScelta === null || categoriaScelta === id;

  /*
   * Ricerca per nome, ingredienti o denominazione.
   *
   * Su una carta da quindici voci non serve; su una da duecento — un sushi,
   * dove Uramaki da solo sono quaranta righe — scorrere per trovare il
   * salmone è la differenza fra ordinare e chiamare il cameriere. Cercando,
   * le portate si ignorano: chi scrive "salmone" lo vuole ovunque sia.
   */
  const cercato = cerca.trim().toLowerCase();
  const trovati = useMemo(() => {
    if (cercato.length < 2) return null;
    return items.filter((i) =>
      [i.name, i.description, i.ingredients, i.denomination]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(cercato)
    );
  }, [cercato, items]);

  return (
    <div className="space-y-7 pb-28">
      {/*
        Il filtro per portata, come sul menu pubblico.

        Su una carta da quindici voci si scorre; su una da settanta — un
        ristorante vero, con vini e bevande — trovare i secondi voleva dire
        passare in mezzo a tutto il resto. La barra resta appiccicata in alto
        mentre si scorre, perché serve proprio mentre si è a metà elenco.
      */}
      {/* La ricerca compare solo quando la carta è lunga davvero: su
          quindici voci sarebbe un campo in più da guardare per niente. */}
      {items.length >= 40 && (
        <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
          <input
            type="search"
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
            placeholder="Cerca un piatto o un ingrediente"
            aria-label="Cerca nel menu"
            className="min-h-11 w-full rounded-full border border-border bg-surface px-4 text-base"
          />
        </div>
      )}

      {trovati !== null ? (
        <section aria-label={`Risultati per ${cerca}`}>
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">
            {trovati.length === 0
              ? `Nessun piatto per "${cerca}"`
              : `${trovati.length} ${trovati.length === 1 ? "piatto" : "piatti"} per "${cerca}"`}
          </h2>
          {trovati.length === 0 ? (
            <p className="text-sm text-muted">
              Prova con una parola sola, o chiedi al personale.
            </p>
          ) : (
            <ul className="space-y-2.5">{trovati.map(renderItem)}</ul>
          )}
        </section>
      ) : (
        <>
      {categoriePiene.length > 1 && (
        <nav
          aria-label="Filtra per portata"
          className={`sticky z-10 -mx-4 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur ${
            items.length >= 40 ? "top-[3.75rem]" : "top-0"
          }`}
        >
          <ul className="flex gap-1.5">
            <li>
              <button
                type="button"
                onClick={() => setCategoriaScelta(null)}
                aria-current={categoriaScelta === null ? "true" : undefined}
                className={`flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium ${
                  categoriaScelta === null
                    ? "bg-accent text-accent-foreground"
                    : "border border-border"
                }`}
              >
                Tutto
              </button>
            </li>
            {categoriePiene.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setCategoriaScelta(c.id)}
                  aria-current={categoriaScelta === c.id ? "true" : undefined}
                  className={`flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium ${
                    categoriaScelta === c.id
                      ? "bg-accent text-accent-foreground"
                      : "border border-border"
                  }`}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {categoriePiene.map((cat) => {
        const catItems = itemsByCategory.get(cat.id) ?? [];
        if (!mostra(cat.id)) return null;
        return (
          <section key={cat.id}>
            <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">
              {cat.name}
            </h2>
            <ul className="space-y-2.5">{catItems.map(renderItem)}</ul>
          </section>
        );
      })}

      {uncategorised.length > 0 && mostra(null) && (
        <section>
          <ul className="space-y-2.5">{uncategorised.map(renderItem)}</ul>
        </section>
      )}
        </>
      )}

      {/* Quantità, note e "Ordina" compaiono solo dopo il primo piatto: una
          scelta giusta, perché a carrello vuoto sarebbero comandi spenti. Ma
          a schermo vuoto la pagina sembrava una carta da leggere e basta, e
          chi non tocca il + non scopre mai che si ordina da qui. */}
      {lines.length === 0 && items.length > 0 && (
        <p className="sticky bottom-3 z-20 mx-auto max-w-2xl rounded-full border border-accent bg-surface/95 px-4 py-3 text-center text-sm shadow-lg backdrop-blur">
          Tocca <strong className="text-accent">+</strong> per ordinare dal
          tavolo. Poi potrai cambiare le quantità e aggiungere una nota per la
          cucina.
        </p>
      )}

      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Il menu non è ancora disponibile. Chiedi al personale.
        </p>
      )}

      {/*
        Il riepilogo dell'ordine, come sul tavolo di un sushi.

        Prima non esisteva: le righe con varianti finivano nel carrello e nel
        totale senza comparire da nessuna parte, quindi non si potevano
        vedere, ridurre, togliere né annotare — e chi sbagliava porzione
        doveva ricaricare la pagina perdendo tutto. Qui ogni riga ha le sue
        scelte scritte, il suo meno, la sua nota.

        Su schermo largo sta di lato e resta fermo mentre si scorre il menu;
        su telefono si apre dalla barra in fondo, perché lo spazio è del
        menu.
      */}
      {/*
        Il riepilogo dell'ordine, come sul tavolo di un sushi.

        Prima non esisteva: le righe con varianti finivano nel carrello e nel
        totale senza comparire da nessuna parte, quindi non si potevano
        vedere, ridurre, togliere né annotare — e chi sbagliava porzione
        doveva ricaricare la pagina perdendo tutto.

        Ogni riga sta su una riga sola: quantità, nome, prezzo. Con venti
        piatti un blocco alto per ciascuno diventa un lenzuolo da scorrere, e
        su un telefono il riepilogo serve proprio a NON scorrere. La nota si
        apre solo su richiesta, e resta aperta se c'è già scritto qualcosa.
      */}
      {lines.length > 0 && (
        <aside
          className={`fixed z-30 flex flex-col border-border bg-surface lg:right-4 lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:w-80 lg:rounded-2xl lg:border lg:shadow-xl ${
            riepilogoAperto
              ? "inset-x-0 bottom-0 max-h-[80dvh] rounded-t-2xl border-t shadow-2xl"
              : "hidden lg:flex"
          }`}
          aria-label="Il tuo ordine"
        >
          <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-border px-4 py-3">
            <p className="font-semibold">
              Il tuo ordine{" "}
              <span className="text-muted tabular-nums">
                ({lines.reduce((n, l) => n + l.quantity, 0)})
              </span>
            </p>
            <button
              type="button"
              onClick={() => setRiepilogoAperto(false)}
              className="min-h-11 px-2 text-sm underline underline-offset-4 lg:hidden"
            >
              Chiudi
            </button>
          </div>

          {/* Scorre solo l'elenco: intestazione e totale restano fermi, così
              il totale è sempre sotto gli occhi anche con venti piatti. */}
          <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
            {lines.map((l) => {
              const notaAperta = notePerRiga === l.chiave || Boolean(l.notes);
              return (
                <li key={l.chiave} className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => removeItem(l.chiave)}
                      aria-label={`Togli ${l.name}${l.optionsLabel ? " " + l.optionsLabel : ""}`}
                      className="h-9 w-9 shrink-0 rounded-full border border-border text-lg leading-none active:scale-95"
                    >
                      −
                    </button>
                    <span className="w-4 shrink-0 text-center font-semibold tabular-nums">
                      {l.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        addItem(
                          { id: l.menuItemId, name: l.name, price_cents: l.unitPriceCents },
                          l.optionIds,
                          l.unitPriceCents,
                          l.optionsLabel
                        )
                      }
                      aria-label={`Aggiungi ${l.name}${l.optionsLabel ? " " + l.optionsLabel : ""}`}
                      className="h-9 w-9 shrink-0 rounded-full bg-accent text-lg leading-none text-accent-foreground active:scale-95"
                    >
                      +
                    </button>

                    <span className="min-w-0 flex-1 text-sm leading-tight">
                      <span className="block truncate">{l.name}</span>
                      {l.optionsLabel && (
                        <span className="block truncate text-xs text-accent">
                          {l.optionsLabel}
                        </span>
                      )}
                    </span>

                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatPriceCents(l.unitPriceCents * l.quantity, currency)}
                    </span>
                  </div>

                  {notaAperta ? (
                    <input
                      value={l.notes ?? ""}
                      onChange={(e) => setNote(l.chiave, e.target.value)}
                      placeholder="Nota per la cucina"
                      maxLength={140}
                      autoFocus={notePerRiga === l.chiave && !l.notes}
                      aria-label={`Nota per ${l.name}`}
                      className="mt-1.5 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNotePerRiga(l.chiave)}
                      className="mt-0.5 pl-[5.75rem] text-xs text-muted underline underline-offset-2"
                    >
                      nota
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="shrink-0 border-t border-border px-4 py-3">
            <p className="flex items-baseline justify-between gap-3 font-semibold">
              <span>Totale</span>
              <span className="tabular-nums">{formatPriceCents(totalCents, currency)}</span>
            </p>
            {/* Su telefono il riepilogo copre la barra in fondo: senza questo
                si dovrebbe chiudere il pannello per trovare "Ordina". */}
            <button
              type="button"
              onClick={submitOrder}
              disabled={submitting || inAttesa}
              className="mt-2 min-h-12 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95 disabled:opacity-50 lg:hidden"
            >
              {submitting ? "Invio…" : inAttesa ? `Ancora ${attesaTesto}` : "Ordina"}
            </button>
          </div>
        </aside>
      )}

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setRiepilogoAperto((v) => !v)}
              className="flex min-h-11 items-center text-left text-sm lg:pointer-events-none"
            >
              <span>
                <strong className="tabular-nums">
                  {lines.reduce((n, l) => n + l.quantity, 0)}
                </strong>{" "}
                articoli{" "}
                <span className="underline underline-offset-4 lg:hidden">
                  vedi
                </span>
                <span className="block font-semibold tabular-nums">
                  {formatPriceCents(totalCents, currency)}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={submitOrder}
              disabled={submitting || inAttesa}
              className="min-h-12 rounded-full bg-accent px-7 font-medium text-accent-foreground active:scale-95 disabled:opacity-50"
            >
              {submitting ? "Invio..." : inAttesa ? `Ancora ${attesaTesto}` : "Ordina"}
            </button>
          </div>
          {error && <p className="mx-auto mt-2 max-w-2xl text-sm text-danger">{error}</p>}
        </div>
      )}

      {openDish && (
        <DishSheet
          dish={openDish}
          aFormula={aFormula && !openDish.fuori_formula}
          currency={currency}
          pairing={items.find((i) => i.id === openDish.pairing_item_id) ?? null}
          quantitaPerOpzioni={(opzioni) =>
            cart[chiaveRiga(openDish.id, opzioni)]?.quantity ?? 0
          }
          onAdd={(opzioni, prezzo, etichetta) =>
            addItem(openDish, opzioni, prezzo, etichetta)
          }
          onAddPairing={() => {
            const p = items.find((i) => i.id === openDish.pairing_item_id);
            if (p) addItem(p);
          }}
          onClose={() => setOpenDish(null)}
        />
      )}

      {/*
        In basso, non in cima.
        
        Appiccicata a top-0 copriva l'intestazione: il nome del locale, il
        numero del tavolo e i due bottoni sparivano dietro una striscia
        verde. In basso sta dove è appena stato premuto "Ordina", e sopra non
        copre niente perché il carrello a quel punto è vuoto.
      */}
      {submitted && (
        <p
          role="status"
          className="fixed inset-x-0 bottom-0 z-30 bg-success px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-center text-sm font-medium text-white"
        >
          Ordine inviato in cucina.
        </p>
      )}
    </div>
  );
}
