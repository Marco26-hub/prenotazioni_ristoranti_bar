"use client";

import { useState } from "react";
import { salvaPiantina } from "./piantina-actions";
import { riconosciTavoli, applicaProposte, type Proposta } from "./riconosci-actions";

/** Lato lungo massimo del raster prodotto: oltre non si guadagna leggibilità. */
const LATO_MAX = 1600;

/**
 * Converte la prima pagina di un PDF in PNG dentro il browser.
 *
 * Fatto qui e non sul server per due motivi: il server non deve interpretare
 * un PDF caricato da un utente, e la conversione pesa sulla macchina di chi
 * carica invece che sulla funzione serverless.
 *
 * pdfjs è importato al momento dell'uso: pesa parecchio, e la maggior parte
 * dei locali carica un'immagine, non un PDF.
 */
async function pdfInPng(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pagina = await doc.getPage(1);

  const base = pagina.getViewport({ scale: 1 });
  const scala = Math.min(LATO_MAX / Math.max(base.width, base.height), 3);
  const viewport = pagina.getViewport({ scale: Math.max(scala, 0.5) });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");

  // Le piantine sono quasi sempre linee nere su nulla: senza fondo bianco
  // diventano linee nere su trasparente, illeggibili sul tema scuro.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await pagina.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/png");
}

/** Riduce un raster troppo grande prima di trasformarlo in data URL. */
async function immagineRidotta(file: File): Promise<string> {
  const grezzo = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = () => rej(new Error("File illeggibile"));
    fr.readAsDataURL(file);
  });

  // L'SVG è vettoriale: ridisegnarlo su canvas lo rasterizzerebbe e basta.
  if (file.type === "image/svg+xml") return grezzo;

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Immagine non valida"));
    i.src = grezzo;
  });

  if (Math.max(img.width, img.height) <= LATO_MAX && grezzo.length < 900_000) {
    return grezzo;
  }

  const scala = LATO_MAX / Math.max(img.width, img.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * Math.min(scala, 1));
  canvas.height = Math.round(img.height * Math.min(scala, 1));
  const ctx = canvas.getContext("2d");
  if (!ctx) return grezzo;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function PiantinaForm({
  presente,
  opacita: opacitaIniziale,
  aiAttiva,
}: {
  presente: boolean;
  opacita: number;
  aiAttiva: boolean;
}) {
  // Locale, per poterla riportare indietro se il salvataggio non riesce.
  const [opacita, setOpacita] = useState(opacitaIniziale);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [leggendo, setLeggendo] = useState(false);
  const [proposte, setProposte] = useState<Proposta[] | null>(null);
  const [scartate, setScartate] = useState<Set<number>>(() => new Set());

  async function riconosci() {
    setLeggendo(true);
    setAvviso(null);
    setProposte(null);
    const r = await riconosciTavoli();
    setAvviso(r.errore ?? r.avviso ?? null);
    if (r.proposte?.length) {
      setProposte(r.proposte);
      setScartate(new Set());
    }
    setLeggendo(false);
  }

  async function applica() {
    if (!proposte) return;
    setLeggendo(true);
    const scelte = proposte.filter((_, i) => !scartate.has(i));
    const r = await applicaProposte(scelte);
    setAvviso(r.error ?? r.ok ?? null);
    if (!r.error) setProposte(null);
    setLeggendo(false);
  }

  async function carica(file: File) {
    setAvviso(null);
    setPending(true);

    /*
     * Leggere il file e salvarlo sono due passi distinti, e vanno raccontati
     * come tali.
     *
     * Con un try solo attorno a entrambi, un salvataggio rifiutato — capita
     * a chi non è titolare o responsabile — usciva come "non riesco a
     * leggere il file": si finiva a riconvertire il PDF, a provarne un
     * altro, a dare la colpa allo scanner, mentre il file era perfetto e il
     * problema era il permesso.
     */
    let dataUrl: string;
    try {
      dataUrl =
        file.type === "application/pdf" ? await pdfInPng(file) : await immagineRidotta(file);
    } catch (e) {
      setAvviso(
        e instanceof Error && e.message
          ? `Non riesco a leggere il file: ${e.message}`
          : "Non riesco a leggere il file."
      );
      setPending(false);
      return;
    }

    try {
      const fd = new FormData();
      fd.set("dataUrl", dataUrl);
      fd.set("opacita", String(opacita));
      const r = await salvaPiantina(fd);
      setAvviso(r.error ?? r.ok ?? null);
    } catch {
      setAvviso(
        "Il file va bene, ma non è stato salvato: serve il ruolo di titolare o responsabile."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mb-3 rounded-xl border border-border bg-surface p-3">
      <p className="text-sm font-medium">Piantina della sala</p>
      <p className="mt-0.5 text-xs text-muted">
        Carica la pianta del locale e disponici sopra i tavoli. PDF, SVG, PNG o
        JPG. Il PDF viene convertito qui nel browser: si usa la prima pagina.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="min-h-11 cursor-pointer rounded-full border border-border px-4 py-2.5 text-sm">
          {pending ? "Elaboro…" : presente ? "Sostituisci piantina" : "Scegli file"}
          <input
            type="file"
            accept="application/pdf,image/svg+xml,image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={pending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void carica(f);
            }}
          />
        </label>

        {presente && (
          <>
            <label className="flex items-center gap-2 text-xs text-muted">
              Trasparenza
              <input
                type="range"
                min="0"
                max="100"
                value={opacita}
                disabled={pending}
                onChange={async (e) => {
                  /*
                   * L'esito non si butta via.
                   *
                   * Prima il cursore si spostava, il salvataggio poteva
                   * fallire — permessi, rete — e non lo diceva nessuno: la
                   * trasparenza sembrava impostata e al ricarico della
                   * pagina tornava com'era, senza che si capisse perché.
                   */
                  const valore = e.target.value;
                  const precedente = opacita;
                  setOpacita(Number(valore));
                  try {
                    const fd = new FormData();
                    fd.set("opacita", valore);
                    const r = await salvaPiantina(fd);
                    if (r.error) {
                      setAvviso(r.error);
                      setOpacita(precedente);
                    }
                  } catch {
                    setAvviso(
                      "Trasparenza non salvata: serve il ruolo di titolare o responsabile."
                    );
                    setOpacita(precedente);
                  }
                }}
                className="w-32"
              />
            </label>

            <button
              type="button"
              disabled={pending || leggendo || !aiAttiva}
              onClick={riconosci}
              title={
                aiAttiva
                  ? undefined
                  : "Serve la chiave OpenRouter, si imposta in Impostazioni"
              }
              className="min-h-11 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {leggendo ? "Leggo la pianta…" : "Riconosci i tavoli"}
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                const fd = new FormData();
                fd.set("rimuovi", "1");
                const r = await salvaPiantina(fd);
                setAvviso(r.error ?? r.ok ?? null);
                setProposte(null);
              }}
              className="min-h-11 px-2 text-sm text-danger underline underline-offset-4"
            >
              Rimuovi
            </button>
          </>
        )}
      </div>

      {avviso && (
        <p role="status" className="mt-2 text-sm font-medium">
          {avviso}
        </p>
      )}

      {proposte && proposte.length > 0 && (
        <div className="mt-3 rounded-lg border border-accent p-3">
          <p className="text-sm font-medium">
            {proposte.length} tavoli riconosciuti
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Controlla prima di applicare: un tavolo creato per sbaglio finisce
            sui QR e nei conti. Togli la spunta a quello che non è un tavolo.
          </p>

          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {proposte.map((p, i) => (
              <li key={`${p.codice}-${i}`}>
                <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={!scartate.has(i)}
                    onChange={() =>
                      setScartate((s) => {
                        const n = new Set(s);
                        if (n.has(i)) n.delete(i);
                        else n.add(i);
                        return n;
                      })
                    }
                    className="h-4 w-4"
                  />
                  <span>
                    <strong>{p.codice}</strong> · {p.posti}p · {p.forma}
                    {p.esistente && (
                      <span className="ml-1 text-xs text-muted">
                        (esiste: verrà spostato)
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applica}
              disabled={leggendo || scartate.size === proposte.length}
              className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {leggendo
                ? "Applico…"
                : `Applica ${proposte.length - scartate.size} tavoli`}
            </button>
            <button
              type="button"
              onClick={() => setProposte(null)}
              className="min-h-11 px-3 text-sm underline underline-offset-4"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
