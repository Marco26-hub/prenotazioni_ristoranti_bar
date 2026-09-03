"use client";

import { useMemo, useRef, useState } from "react";
import { PiantinaForm } from "./piantina-form";
import { COLONNE, RIGHE, type Posizione } from "./sala-griglia";
import {
  salvaPianta,
  aggiungiTavoloInSala,
  aggiornaTavoloInSala,
} from "./sala-pianta-actions";

export interface TavoloPianta {
  id: string;
  codice: string;
  posti: number;
  forma: string;
  x: number | null;
  y: number | null;
  stato: StatoTavolo;
  /** Quanto resta da incassare, per i tavoli pagati in parte. */
  residuoCents: number | null;
}

/**
 * Lo stato che conta guardando la sala da lontano.
 *
 * "Occupato o libero" non basta: un tavolo che ha appena ordinato e uno con
 * due piatti fermi al passe da dieci minuti hanno bisogni opposti, e finché
 * erano dello stesso colore la pianta non diceva dove correre.
 */
export type StatoTavolo =
  | "libero"
  | "incorso"
  | "parziale"
  | "pronto"
  | "saldato";

const COLORE: Record<StatoTavolo, string> = {
  libero: "border-border bg-background text-foreground",
  incorso: "border-accent bg-accent text-accent-foreground",
  // Alla romana con qualche quota già incassata: il tavolo sta chiudendo ma
  // non è chiuso, e chi passa deve sapere che manca ancora qualcuno.
  parziale: "border-amber-500 bg-amber-500/25 text-foreground",
  // Rosso: è l'unica cosa in sala che peggiora da sola mentre la guardi.
  pronto: "border-danger bg-danger text-white animate-pulse",
  saldato: "border-success bg-success/25 text-foreground",
};

const VOCE: Record<StatoTavolo, string> = {
  libero: "libero",
  incorso: "in corso",
  parziale: "pagato in parte",
  pronto: "piatti pronti da portare",
  saldato: "saldato, da liberare",
};

const FORME: Record<string, string> = {
  rettangolo: "rounded-lg",
  tondo: "rounded-full",
  bancone: "rounded-sm",
};

/**
 * Dispone i tavoli mai posizionati in righe, così una sala appena creata
 * non parte con tutto ammucchiato nell'angolo in alto a sinistra.
 */
function posizioneIniziale(tavoli: TavoloPianta[]): Map<string, { x: number; y: number }> {
  const mappa = new Map<string, { x: number; y: number }>();
  const occupate = new Set<string>();

  for (const t of tavoli) {
    if (t.x !== null && t.y !== null) {
      mappa.set(t.id, { x: t.x, y: t.y });
      occupate.add(`${t.x},${t.y}`);
    }
  }

  let cursore = 0;
  for (const t of tavoli) {
    if (mappa.has(t.id)) continue;
    // Passo di due celle: i tavoli restano staccati e si leggono come oggetti
    // distinti invece che come un blocco unico.
    while (cursore < COLONNE * RIGHE) {
      const x = (cursore * 2) % COLONNE;
      const y = Math.floor((cursore * 2) / COLONNE) * 2;
      cursore += 1;
      if (y >= RIGHE || occupate.has(`${x},${y}`)) continue;
      mappa.set(t.id, { x, y });
      occupate.add(`${x},${y}`);
      break;
    }
    if (!mappa.has(t.id)) mappa.set(t.id, { x: 0, y: 0 });
  }
  return mappa;
}

export function PiantaSala({
  tavoli,
  onApri,
  piantina,
  piantinaOpacita,
  aiAttiva,
}: {
  tavoli: TavoloPianta[];
  onApri: (id: string) => void;
  piantina: string | null;
  piantinaOpacita: number;
  aiAttiva: boolean;
}) {
  const [disponi, setDisponi] = useState(false);
  // In stato solo gli spostamenti fatti a mano in questa sessione. Il resto
  // si ricalcola dai dati a ogni render: così un tavolo aggiunto altrove
  // compare senza un effetto che rincorra le props.
  const [spostati, setSpostati] = useState<Map<string, { x: number; y: number }>>(
    () => new Map()
  );
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [sporco, setSporco] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nuovoAperto, setNuovoAperto] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);
  const trascinato = useRef<string | null>(null);

  const pos = useMemo(() => {
    const base = posizioneIniziale(tavoli);
    for (const t of tavoli) {
      const mio = spostati.get(t.id);
      if (mio) base.set(t.id, mio);
    }
    return base;
  }, [tavoli, spostati]);

  function cellaDaEvento(clientX: number, clientY: number) {
    const area = areaRef.current;
    if (!area) return null;
    const r = area.getBoundingClientRect();
    const x = Math.floor(((clientX - r.left) / r.width) * COLONNE);
    const y = Math.floor(((clientY - r.top) / r.height) * RIGHE);
    return {
      x: Math.min(COLONNE - 1, Math.max(0, x)),
      y: Math.min(RIGHE - 1, Math.max(0, y)),
    };
  }

  function muovi(id: string, x: number, y: number) {
    setSpostati((p) => new Map(p).set(id, { x, y }));
    setSporco(true);
  }

  // Pointer events e non drag-and-drop HTML: quello nativo su tablet non
  // parte, e la sala si dispone quasi sempre da tablet.
  function onPointerDown(e: React.PointerEvent, id: string) {
    if (!disponi) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    trascinato.current = id;
    setSelezionato(id);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!disponi || !trascinato.current) return;
    const cella = cellaDaEvento(e.clientX, e.clientY);
    if (!cella) return;
    const attuale = pos.get(trascinato.current);
    if (attuale && attuale.x === cella.x && attuale.y === cella.y) return;
    muovi(trascinato.current, cella.x, cella.y);
  }

  function onPointerUp() {
    trascinato.current = null;
  }

  // Tastiera: trascinare non è l'unico modo di spostare, e con il mouse
  // preciso al pixel una griglia si aggiusta meglio con le frecce.
  function onKeyDown(e: React.KeyboardEvent, id: string) {
    if (!disponi) return;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    const p = pos.get(id) ?? { x: 0, y: 0 };
    muovi(
      id,
      Math.min(COLONNE - 1, Math.max(0, p.x + d[0])),
      Math.min(RIGHE - 1, Math.max(0, p.y + d[1]))
    );
  }

  async function salva() {
    setSalvando(true);
    setAvviso(null);
    const elenco: Posizione[] = [...pos].map(([id, p]) => ({ id, x: p.x, y: p.y }));
    const r = await salvaPianta(elenco);
    setAvviso(r.error ?? r.ok ?? null);
    if (!r.error) setSporco(false);
    setSalvando(false);
  }

  const selezione = tavoli.find((t) => t.id === selezionato) ?? null;

  return (
    <section className="mb-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDisponi((v) => !v);
              setSelezionato(null);
              setNuovoAperto(false);
            }}
            aria-pressed={disponi}
            className={`min-h-11 rounded-full px-4 text-sm font-medium ${
              disponi
                ? "bg-accent text-accent-foreground"
                : "border border-border text-foreground"
            }`}
          >
            {disponi ? "Fine disposizione" : "Disponi la sala"}
          </button>

          {disponi && (
            <button
              type="button"
              onClick={() => setNuovoAperto((v) => !v)}
              className="min-h-11 rounded-full border border-accent px-4 text-sm font-medium"
            >
              + Aggiungi tavolo
            </button>
          )}
        </div>

        {disponi && (
          <div className="flex flex-wrap items-center gap-3">
            {sporco && <span className="text-sm text-amber-600">Modifiche non salvate</span>}
            <button
              type="button"
              onClick={salva}
              disabled={salvando || !sporco}
              className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {salvando ? "Salvo…" : "Salva disposizione"}
            </button>
          </div>
        )}
      </div>

      {disponi && (
        <p className="mb-3 text-sm text-muted">
          Trascina i tavoli dove stanno davvero in sala. Con la tastiera:
          seleziona e usa le frecce. Tocca un tavolo per cambiarne posti e
          forma.
        </p>
      )}

      {avviso && (
        <p role="status" className="mb-3 text-sm font-medium">
          {avviso}
        </p>
      )}

      {disponi && (
        <PiantinaForm
          presente={Boolean(piantina)}
          opacita={piantinaOpacita}
          aiAttiva={aiAttiva}
        />
      )}

      <div
        ref={areaRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative w-full overflow-hidden rounded-xl border bg-surface ${
          disponi ? "border-accent" : "border-border"
        }`}
        style={{
          aspectRatio: `${COLONNE} / ${RIGHE}`,
          backgroundImage: disponi
            ? `linear-gradient(to right, color-mix(in srgb, currentColor 8%, transparent) 1px, transparent 1px),
               linear-gradient(to bottom, color-mix(in srgb, currentColor 8%, transparent) 1px, transparent 1px)`
            : undefined,
          backgroundSize: `${100 / COLONNE}% ${100 / RIGHE}%`,
        }}
      >
        {piantina && (
          /* Dentro un <img>: un SVG caricato dal locale non deve poter
             eseguire script né chiamare l'esterno. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={piantina}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain select-none"
            style={{ opacity: piantinaOpacita / 100 }}
          />
        )}

        {tavoli.map((t) => {
          const p = pos.get(t.id) ?? { x: 0, y: 0 };
          // I tavoli grandi occupano più spazio: una pianta in cui un due
          // posti e un dieci posti sono uguali non rappresenta la sala.
          const largo = t.forma === "bancone" ? 2.6 : t.posti >= 6 ? 1.9 : 1.4;
          const alto = t.forma === "bancone" ? 0.9 : t.posti >= 6 ? 1.6 : 1.4;

          return (
            <button
              key={t.id}
              type="button"
              onPointerDown={(e) => onPointerDown(e, t.id)}
              onKeyDown={(e) => onKeyDown(e, t.id)}
              onClick={() => {
                if (disponi) setSelezionato(t.id);
                else onApri(t.id);
              }}
              aria-label={
                disponi
                  ? `Sposta ${t.codice}, ${t.posti} posti`
                  : `Apri ${t.codice}, ${VOCE[t.stato]}`
              }
              className={`absolute flex flex-col items-center justify-center border text-center leading-none shadow-sm transition-colors ${
                FORME[t.forma] ?? FORME.rettangolo
              } ${COLORE[t.stato]} ${disponi ? "cursor-grab touch-none active:cursor-grabbing" : ""} ${
                selezionato === t.id && disponi ? "ring-2 ring-accent ring-offset-1" : ""
              }`}
              style={{
                left: `${(p.x / COLONNE) * 100}%`,
                top: `${(p.y / RIGHE) * 100}%`,
                width: `${(largo / COLONNE) * 100}%`,
                height: `${(alto / RIGHE) * 100}%`,
              }}
            >
              <span className="text-[clamp(0.6rem,1.5vw,0.9rem)] font-semibold">
                {t.codice}
              </span>
              <span className="text-[clamp(0.5rem,1.1vw,0.7rem)] opacity-70">
                {/* Su un tavolo che sta pagando alla romana il numero utile
                    non è quanti posti ha, è quanto manca. */}
                {t.stato === "parziale" && t.residuoCents !== null
                  ? `−${(t.residuoCents / 100).toFixed(0)} €`
                  : `${t.posti}p`}
              </span>
            </button>
          );
        })}

        {tavoli.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">
            Nessun tavolo. Apri “Disponi la sala” e aggiungine uno.
          </p>
        )}
      </div>

      {nuovoAperto && (
        <FormNuovoTavolo
          onFatto={(msg) => {
            setAvviso(msg);
            setNuovoAperto(false);
          }}
        />
      )}

      {!disponi && tavoli.some((t) => t.stato !== "libero") && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {(["incorso", "parziale", "pronto", "saldato"] as StatoTavolo[])
            .filter((k) => tavoli.some((t) => t.stato === k))
            .map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`inline-block h-3 w-3 rounded-sm border ${COLORE[k].replace("animate-pulse", "")}`}
                />
                {VOCE[k]}
              </li>
            ))}
        </ul>
      )}

      {/* Sotto la pianta e non sopra: comparendo sopra spingeva giù l'area
          proprio mentre si trascinava, e il tavolo scappava da sotto il dito. */}
      {disponi && selezione && (
        <FormTavolo
          key={selezione.id}
          tavolo={selezione}
          onFatto={(msg) => setAvviso(msg)}
        />
      )}
    </section>
  );
}

const CAMPO =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

function FormNuovoTavolo({ onFatto }: { onFatto: (msg: string) => void }) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (fd) => {
        setPending(true);
        const r = await aggiungiTavoloInSala(fd);
        onFatto(r.error ?? r.ok ?? "");
        setPending(false);
      }}
      className="mt-3 grid gap-2 rounded-xl border border-accent bg-surface p-3 sm:grid-cols-[1fr_7rem_10rem_auto]"
    >
      <label className="text-xs font-medium text-muted">
        Nome
        <input name="code" placeholder="T11, Dehors 3…" required className={`${CAMPO} mt-1`} />
      </label>
      <label className="text-xs font-medium text-muted">
        Posti
        <input
          name="seats"
          type="number"
          min="1"
          max="40"
          defaultValue={4}
          required
          className={`${CAMPO} mt-1`}
        />
      </label>
      <label className="text-xs font-medium text-muted">
        Forma
        <select name="shape" defaultValue="rettangolo" className={`${CAMPO} mt-1`}>
          <option value="rettangolo">Rettangolare</option>
          <option value="tondo">Tondo</option>
          <option value="bancone">Bancone</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 self-end rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "…" : "Crea"}
      </button>
    </form>
  );
}

function FormTavolo({
  tavolo,
  onFatto,
}: {
  tavolo: TavoloPianta;
  onFatto: (msg: string) => void;
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (fd) => {
        setPending(true);
        const r = await aggiornaTavoloInSala(fd);
        onFatto(r.error ?? r.ok ?? "");
        setPending(false);
      }}
      className="mt-3 grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[auto_7rem_10rem_auto] sm:items-end"
    >
      <input type="hidden" name="id" value={tavolo.id} />
      <p className="self-end pb-2 font-semibold">{tavolo.codice}</p>
      <label className="text-xs font-medium text-muted">
        Posti
        <input
          name="seats"
          type="number"
          min="1"
          max="40"
          defaultValue={tavolo.posti}
          className={`${CAMPO} mt-1`}
        />
      </label>
      <label className="text-xs font-medium text-muted">
        Forma
        <select name="shape" defaultValue={tavolo.forma} className={`${CAMPO} mt-1`}>
          <option value="rettangolo">Rettangolare</option>
          <option value="tondo">Tondo</option>
          <option value="bancone">Bancone</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full border border-border px-5 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "…" : "Salva tavolo"}
      </button>
    </form>
  );
}
