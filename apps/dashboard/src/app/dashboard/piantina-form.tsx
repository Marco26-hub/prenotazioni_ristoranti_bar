"use client";

import { useState } from "react";
import { salvaPiantina } from "./piantina-actions";

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
  opacita,
}: {
  presente: boolean;
  opacita: number;
}) {
  const [avviso, setAvviso] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function carica(file: File) {
    setAvviso(null);
    setPending(true);
    try {
      const dataUrl =
        file.type === "application/pdf" ? await pdfInPng(file) : await immagineRidotta(file);

      const fd = new FormData();
      fd.set("dataUrl", dataUrl);
      fd.set("opacita", String(opacita));
      const r = await salvaPiantina(fd);
      setAvviso(r.error ?? r.ok ?? null);
    } catch (e) {
      setAvviso(
        e instanceof Error && e.message
          ? `Non riesco a leggere il file: ${e.message}`
          : "Non riesco a leggere il file."
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
                defaultValue={opacita}
                disabled={pending}
                onChange={async (e) => {
                  const fd = new FormData();
                  fd.set("opacita", e.target.value);
                  await salvaPiantina(fd);
                }}
                className="w-32"
              />
            </label>

            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                const fd = new FormData();
                fd.set("rimuovi", "1");
                const r = await salvaPiantina(fd);
                setAvviso(r.error ?? r.ok ?? null);
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
    </div>
  );
}
