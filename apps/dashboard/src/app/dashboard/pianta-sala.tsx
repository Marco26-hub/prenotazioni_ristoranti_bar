"use client";

import { useMemo, useRef, useState } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tSala } from "@/i18n/sala";
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
  zona: string | null;
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
  | "ritardo"
  | "pronto"
  | "saldato"
  | "daliberare";

const COLORE: Record<StatoTavolo, string> = {
  libero: "border-border bg-background text-muted",
  // Viola: servizio in corso, nessuna azione richiesta. Prima era il colore
  // del marchio, lo stesso dell'ambra del pagamento parziale a un metro di
  // distanza.
  incorso: "border-violet-400 bg-violet-500 text-white",
  // Alla romana con qualche quota già incassata: il tavolo sta chiudendo ma
  // non è chiuso, e chi passa deve sapere che manca ancora qualcuno.
  parziale: "border-2 border-amber-400 bg-amber-500 text-white",
  // Rosso e lampeggiante solo per il ritardo: è l'unico stato in cui il
  // cliente non ha niente davanti. Un rosso che vale per due cose diverse
  // non dice a nessuno dove andare.
  ritardo: "border-4 border-danger bg-danger text-white animate-pulse font-bold",
  // Blu fisso: c'è un piatto da portare, non un problema. Colore diverso e
  // niente lampeggio, così si distingue dal ritardo anche di sfuggita.
  pronto: "border-2 border-sky-400 bg-sky-500 text-white",
  saldato: "border-2 border-emerald-400 bg-emerald-600 text-white",
  // Fucsia e non rosso: il rosso è già il ritardo in cucina, e due allarmi
  // dello stesso colore non dicono a nessuno dove andare. Qui non c'è un
  // guaio, c'è un coperto da recuperare.
  daliberare: "border-4 border-fuchsia-300 bg-fuchsia-600 text-white animate-pulse font-bold",
};

const VOCE: Record<
  StatoTavolo,
  | "stato.libero"
  | "stato.incorso"
  | "stato.parziale"
  | "stato.ritardo"
  | "stato.daliberare"
  | "stato.pronto"
  | "stato.saldato"
> = {
  libero: "stato.libero",
  incorso: "stato.incorso",
  parziale: "stato.parziale",
  ritardo: "stato.ritardo",
  daliberare: "stato.daliberare",
  pronto: "stato.pronto",
  saldato: "stato.saldato",
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

  for (const tav of tavoli) {
    if (tav.x !== null && tav.y !== null) {
      mappa.set(tav.id, { x: tav.x, y: tav.y });
      occupate.add(`${tav.x},${tav.y}`);
    }
  }

  let cursore = 0;
  for (const tav of tavoli) {
    if (mappa.has(tav.id)) continue;
    // Passo di due celle: i tavoli restano staccati e si leggono come oggetti
    // distinti invece che come un blocco unico.
    while (cursore < COLONNE * RIGHE) {
      const x = (cursore * 2) % COLONNE;
      const y = Math.floor((cursore * 2) / COLONNE) * 2;
      cursore += 1;
      if (y >= RIGHE || occupate.has(`${x},${y}`)) continue;
      mappa.set(tav.id, { x, y });
      occupate.add(`${x},${y}`);
      break;
    }
    if (!mappa.has(tav.id)) mappa.set(tav.id, { x: 0, y: 0 });
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
  const t = tSala(useLingua());
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
  const [zonaScelta, setZonaScelta] = useState("tutte");

  const areaRef = useRef<HTMLDivElement>(null);
  const trascinato = useRef<string | null>(null);

  const pos = useMemo(() => {
    const base = posizioneIniziale(tavoli);
    for (const tav of tavoli) {
      const mio = spostati.get(tav.id);
      if (mio) base.set(tav.id, mio);
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
    try {
      const r = await salvaPianta(elenco);
      setAvviso(r.error ?? r.ok ?? null);
      if (!r.error) setSporco(false);
    } catch {
      /*
       * Disporre la sala si può fare in due; salvarla no.
       *
       * Il salvataggio vuole titolare o responsabile e l'azione rifiuta
       * lanciando: senza questo blocco la promessa restava appesa, il bottone
       * diceva "Salvo…" per sempre e non compariva nessun messaggio. Chi era
       * in sala aveva appena trascinato venti tavoli ed era convinto di
       * averli salvati — li ritrovava dov'erano prima e non capiva perché.
       */
      setAvviso(t("pianta.errore.permessi"));
    } finally {
      setSalvando(false);
    }
  }

  const selezione = tavoli.find((tav) => tav.id === selezionato) ?? null;

  // I nomi che il locale ha già usato: si scrivono una volta e poi si
  // scelgono, senza che "Dehors" e "dehors" diventino due sale.
  const zone = [...new Set(tavoli.map((tav) => tav.zona).filter(Boolean))] as string[];

  return (
    <section className="mb-5">
      <datalist id="zone-locale">
        {zone.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>

      {zone.length > 1 && !disponi && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{t("pianta.sala")}</span>
          {["tutte", ...zone].map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZonaScelta(z)}
              aria-pressed={zonaScelta === z}
              className={`min-h-11 rounded-full px-4 text-sm font-medium ${
                zonaScelta === z ? "bg-accent text-accent-foreground" : "border border-border"
              }`}
            >
              {z === "tutte" ? t("pianta.sala.tutte") : z}
            </button>
          ))}
        </div>
      )}

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
            {disponi ? t("pianta.disponi.fine") : t("pianta.disponi")}
          </button>

          {disponi && (
            <button
              type="button"
              onClick={() => setNuovoAperto((v) => !v)}
              className="min-h-11 rounded-full border border-accent px-4 text-sm font-medium"
            >
              {t("pianta.aggiungi")}
            </button>
          )}
        </div>

        {disponi && (
          <div className="flex flex-wrap items-center gap-3">
            {sporco && (
              <span className="text-sm text-amber-600">{t("pianta.non_salvate")}</span>
            )}
            <button
              type="button"
              onClick={salva}
              disabled={salvando || !sporco}
              className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {salvando ? t("pianta.salvando") : t("pianta.salva")}
            </button>
          </div>
        )}
      </div>

      {disponi && (
        <p className="mb-3 text-sm text-muted">{t("pianta.istruzioni")}</p>
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

        {tavoli.map((tav) => {
          // Filtrare per sala nasconde i tavoli, non li sposta: la
          // disposizione salvata resta quella.
          if (!disponi && zonaScelta !== "tutte" && tav.zona !== zonaScelta) return null;
          const p = pos.get(tav.id) ?? { x: 0, y: 0 };
          // I tavoli grandi occupano più spazio: una pianta in cui un due
          // posti e un dieci posti sono uguali non rappresenta la sala.
          const largo = tav.forma === "bancone" ? 2.6 : tav.posti >= 6 ? 1.9 : 1.4;
          const alto = tav.forma === "bancone" ? 0.9 : tav.posti >= 6 ? 1.6 : 1.4;

          return (
            <button
              key={tav.id}
              type="button"
              onPointerDown={(e) => onPointerDown(e, tav.id)}
              onKeyDown={(e) => onKeyDown(e, tav.id)}
              onClick={() => {
                if (disponi) setSelezionato(tav.id);
                else onApri(tav.id);
              }}
              aria-label={
                disponi
                  ? t("pianta.sposta.aria", { codice: tav.codice, posti: tav.posti })
                  : t("pianta.apri.aria", {
                      codice: tav.codice,
                      stato: t(VOCE[tav.stato]),
                    })
              }
              className={`absolute flex flex-col items-center justify-center border text-center leading-none shadow-sm transition-colors ${
                FORME[tav.forma] ?? FORME.rettangolo
              } ${COLORE[tav.stato]} ${disponi ? "cursor-grab touch-none active:cursor-grabbing" : ""} ${
                selezionato === tav.id && disponi ? "ring-2 ring-accent ring-offset-1" : ""
              }`}
              style={{
                left: `${(p.x / COLONNE) * 100}%`,
                top: `${(p.y / RIGHE) * 100}%`,
                width: `${(largo / COLONNE) * 100}%`,
                height: `${(alto / RIGHE) * 100}%`,
              }}
            >
              <span className="text-[clamp(0.7rem,1.9vw,1.15rem)] font-black tracking-tight [text-shadow:0_1px_2px_rgba(0,0,0,.45)]">
                {tav.codice}
              </span>
              <span className="text-[clamp(0.5rem,1.1vw,0.7rem)] opacity-70">
                {/* Su un tavolo che sta pagando alla romana il numero utile
                    non è quanti posti ha, è quanto manca. */}
                {tav.stato === "parziale" && tav.residuoCents !== null
                  ? t("pianta.residuo_breve", {
                      n: t.numero(tav.residuoCents / 100, 0),
                    })
                  : t("pianta.posti_breve", { n: tav.posti })}
              </span>
            </button>
          );
        })}

        {tavoli.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">
            {t("pianta.vuota")}
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

      {!disponi && tavoli.some((tav) => tav.stato !== "libero") && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {(["incorso", "parziale", "ritardo", "pronto", "saldato", "daliberare"] as StatoTavolo[])
            .filter((k) => tavoli.some((tav) => tav.stato === k))
            .map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`inline-block h-3 w-3 rounded-sm border ${COLORE[k].replace("animate-pulse", "")}`}
                />
                {t(VOCE[k])}
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
  const t = tSala(useLingua());
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
        {t("pianta.campo.nome")}
        <input
          name="code"
          placeholder={t("pianta.campo.nome.esempio")}
          required
          className={`${CAMPO} mt-1`}
        />
      </label>
      <label className="text-xs font-medium text-muted">
        {t("pianta.campo.posti")}
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
        {t("pianta.campo.zona")}
        <input
          name="zona"
          list="zone-locale"
          placeholder={t("pianta.campo.zona.esempio")}
          className={`${CAMPO} mt-1`}
        />
      </label>
      <label className="text-xs font-medium text-muted">
        {t("pianta.campo.forma")}
        <select name="shape" defaultValue="rettangolo" className={`${CAMPO} mt-1`}>
          <option value="rettangolo">{t("pianta.forma.rettangolo")}</option>
          <option value="tondo">{t("pianta.forma.tondo")}</option>
          <option value="bancone">{t("pianta.forma.bancone")}</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 self-end rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? t("pianta.attesa") : t("pianta.crea")}
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
  const t = tSala(useLingua());
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
        {t("pianta.campo.posti")}
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
        {t("pianta.campo.zona")}
        <input
          name="zona"
          list="zone-locale"
          defaultValue={tavolo.zona ?? ""}
          placeholder={t("pianta.campo.zona.esempio")}
          className={`${CAMPO} mt-1`}
        />
      </label>
      <label className="text-xs font-medium text-muted">
        {t("pianta.campo.forma")}
        <select name="shape" defaultValue={tavolo.forma} className={`${CAMPO} mt-1`}>
          <option value="rettangolo">{t("pianta.forma.rettangolo")}</option>
          <option value="tondo">{t("pianta.forma.tondo")}</option>
          <option value="bancone">{t("pianta.forma.bancone")}</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full border border-border px-5 text-sm font-medium disabled:opacity-60"
      >
        {pending ? t("pianta.attesa") : t("pianta.salva_tavolo")}
      </button>
    </form>
  );
}
