import { formatPriceCents } from "@repo/shared";

/**
 * Anteprima di ciò che vede il cliente al tavolo, disegnata in HTML invece
 * che con uno screenshot: resta nitida a ogni densità di schermo, segue il
 * tema chiaro/scuro e non va rifatta a ogni ritocco dell'interfaccia vera.
 */

const PIATTI = [
  { nome: "Tagliatelle al ragù", prezzo: 1400, tag: "Il più ordinato" },
  { nome: "Tortelli di zucca", prezzo: 1300, tag: "Vegetariano" },
  { nome: "Tagliata di manzo", prezzo: 2200, tag: null },
];

export function MockupTelefono() {
  return (
    <div className="telefono mx-auto w-full max-w-[17rem] overflow-hidden">
      <div className="flex items-center justify-between bg-surface px-4 pb-2 pt-3 text-[10px] text-muted">
        <span>20:41</span>
        <span aria-hidden>▮▮▮</span>
      </div>

      <div className="border-b border-border bg-surface px-4 pb-3">
        <p className="text-[11px] uppercase tracking-widest text-muted">Tavolo 7</p>
        <p className="text-base font-semibold leading-tight">Trattoria da Luca</p>
      </div>

      <ul className="divide-y divide-border bg-surface">
        {PIATTI.map((p) => (
          <li key={p.nome} className="flex items-center gap-3 px-4 py-3">
            <div
              aria-hidden
              className="h-11 w-11 shrink-0 rounded-lg bg-[linear-gradient(135deg,var(--accent),#e0a458)] opacity-80"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight">{p.nome}</p>
              {p.tag && <p className="text-[10px] text-muted">{p.tag}</p>}
              <p className="text-[12px] tabular-nums text-muted">
                {formatPriceCents(p.prezzo, "EUR")}
              </p>
            </div>
            <div
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
            >
              +
            </div>
          </li>
        ))}
      </ul>

      <div className="bg-surface px-4 pb-5 pt-3">
        <div className="flex items-center justify-between rounded-full bg-accent px-4 py-2.5 text-[12px] font-medium text-accent-foreground">
          <span>Vai al conto</span>
          <span className="tabular-nums">{formatPriceCents(4900, "EUR")}</span>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted">
          Dividi per piatto · Carta, Apple Pay, Satispay
        </p>
      </div>
    </div>
  );
}
