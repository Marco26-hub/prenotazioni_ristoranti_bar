import { formatPriceCents } from "@repo/shared";

/**
 * Anteprima di ciò che vede il cliente al tavolo, disegnata in HTML invece
 * che con uno screenshot: resta nitida a ogni densità di schermo, segue il
 * tema chiaro/scuro e non va rifatta a ogni ritocco dell'interfaccia vera.
 */

interface Piatto {
  nome: string;
  prezzo: number;
  tag: string | null;
  /** Due tinte per il segnaposto: un quadrato di colore piatto si vede che è finto. */
  tinte: [string, string];
  inCarrello?: number;
}

const PIATTI: Piatto[] = [
  {
    nome: "Tagliatelle al ragù",
    prezzo: 1400,
    tag: "Il più ordinato",
    tinte: ["#c2410c", "#fbbf24"],
    inCarrello: 2,
  },
  {
    nome: "Tortelli di zucca",
    prezzo: 1300,
    tag: "Vegetariano",
    tinte: ["#b45309", "#fcd34d"],
  },
  {
    nome: "Tagliata di manzo",
    prezzo: 2200,
    tag: null,
    tinte: ["#7f1d1d", "#dc2626"],
  },
];

/**
 * Segnaposto del piatto.
 *
 * Non è una foto e non finge di esserlo: due cerchi sfumati su un fondo
 * caldo leggono come "cibo su un piatto" senza spacciarsi per uno scatto
 * vero, che in una pagina di vendita sarebbe una promessa che non manteniamo.
 */
function Segnaposto({ tinte }: { tinte: [string, string] }) {
  return (
    <div
      aria-hidden
      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl"
      style={{ background: `linear-gradient(140deg, ${tinte[0]}, ${tinte[1]})` }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 28%, rgba(255,255,255,.38), transparent 46%), radial-gradient(circle at 72% 74%, rgba(0,0,0,.22), transparent 50%)",
        }}
      />
    </div>
  );
}

export function MockupTelefono() {
  const totale = PIATTI.reduce((s, p) => s + p.prezzo * (p.inCarrello ?? 0), 0);
  const pezzi = PIATTI.reduce((s, p) => s + (p.inCarrello ?? 0), 0);

  return (
    <div className="telefono mx-auto w-full max-w-[21rem]">
      {/* Schermo: il riflesso in alto è ciò che distingue un telefono
          disegnato da un rettangolo con dentro una lista. */}
      <div className="relative overflow-hidden rounded-[1.7rem] bg-surface">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,.10), transparent)",
          }}
        />

        {/* Barra di stato con l'isola dinamica al centro. */}
        <div className="relative flex items-center justify-between px-5 pb-1 pt-2.5 text-[11px] font-medium">
          <span className="tabular-nums">20:41</span>
          <div
            aria-hidden
            className="absolute left-1/2 top-2 h-[22px] w-[76px] -translate-x-1/2 rounded-full bg-black"
          />
          <span aria-hidden className="flex items-end gap-[3px]">
            <span className="h-[5px] w-[3px] rounded-sm bg-current opacity-40" />
            <span className="h-[7px] w-[3px] rounded-sm bg-current opacity-60" />
            <span className="h-[9px] w-[3px] rounded-sm bg-current opacity-80" />
            <span className="ml-1 h-[9px] w-[16px] rounded-[3px] border border-current px-[2px] py-[2px]">
              <span className="block h-full w-2/3 rounded-[1px] bg-current" />
            </span>
          </span>
        </div>

        <div className="border-b border-border px-5 pb-3 pt-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
            Tavolo 7 · Sala
          </p>
          <p className="mt-0.5 text-[17px] font-semibold leading-tight">
            Trattoria da Luca
          </p>
        </div>

        <div className="flex gap-1.5 border-b border-border px-5 py-2.5 text-[11px]">
          {["Antipasti", "Primi", "Secondi"].map((c, i) => (
            <span
              key={c}
              className={`rounded-full px-2.5 py-1 ${
                i === 1
                  ? "bg-accent font-medium text-accent-foreground"
                  : "border border-border text-muted"
              }`}
            >
              {c}
            </span>
          ))}
        </div>

        <ul className="divide-y divide-border">
          {PIATTI.map((p) => (
            <li key={p.nome} className="flex items-center gap-2.5 px-4 py-3">
              <Segnaposto tinte={p.tinte} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium leading-tight">
                  {p.nome}
                </p>
                {p.tag && (
                  <p className="mt-0.5 inline-block rounded-full bg-accent/15 px-1.5 py-px text-[9.5px] font-medium text-accent">
                    {p.tag}
                  </p>
                )}
                <p className="mt-0.5 text-[12.5px] tabular-nums text-muted">
                  {formatPriceCents(p.prezzo, "EUR")}
                </p>
              </div>

              {p.inCarrello ? (
                <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-accent px-1 py-0.5 text-accent-foreground">
                  <span className="flex h-6 w-5 items-center justify-center text-sm leading-none">
                    −
                  </span>
                  <span className="min-w-3 text-center text-[12.5px] font-semibold tabular-nums">
                    {p.inCarrello}
                  </span>
                  <span className="flex h-6 w-5 items-center justify-center text-sm leading-none">
                    +
                  </span>
                </div>
              ) : (
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent text-base font-medium text-accent"
                >
                  +
                </span>
              )}
            </li>
          ))}
        </ul>

        {/* Barra del conto, fissa in basso come nell'app vera. */}
        <div className="border-t border-border bg-surface px-5 pb-5 pt-3">
          <div className="flex items-center justify-between rounded-full bg-accent px-4 py-3 text-[12.5px] font-medium text-accent-foreground">
            <span className="flex items-center gap-2">
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black/20 px-1 text-[11px] tabular-nums">
                {pezzi}
              </span>
              Vai al conto
            </span>
            <span className="tabular-nums">{formatPriceCents(totale, "EUR")}</span>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted">
            Dividi per piatto · Carta, Apple Pay, Satispay
          </p>
          <div
            aria-hidden
            className="mx-auto mt-3 h-1 w-28 rounded-full bg-foreground/25"
          />
        </div>
      </div>
    </div>
  );
}
