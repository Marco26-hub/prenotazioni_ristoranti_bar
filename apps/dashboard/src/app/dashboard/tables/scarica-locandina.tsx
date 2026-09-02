"use client";

import { useState } from "react";

/**
 * A6 a 300 dpi: il formato del cavalierino da tavolo, e la misura che una
 * tipografia accetta senza chiedere altro. In pixel sono 1240 × 1748.
 */
const LARGHEZZA = 1240;
const ALTEZZA = 1748;

export interface DatiLocandina {
  codice: string;
  qrDataUrl: string;
  nomeLocale: string;
  logoUrl: string | null;
  coloreMarchio: string | null;
}

function caricaImmagine(src: string): Promise<HTMLImageElement> {
  return new Promise((risolvi, rifiuta) => {
    const img = new Image();
    // Le immagini sono data URL nostre, ma senza questo un domani un logo
    // servito da URL sporcherebbe la canvas e toDataURL fallirebbe.
    img.crossOrigin = "anonymous";
    img.onload = () => risolvi(img);
    img.onerror = () => rifiuta(new Error("Immagine non caricata"));
    img.src = src;
  });
}

/** Testo centrato, ridotto finché non entra nella larghezza data. */
function testoCentrato(
  ctx: CanvasRenderingContext2D,
  testo: string,
  y: number,
  dimensione: number,
  larghezzaMax: number,
  peso = "600"
) {
  let d = dimensione;
  do {
    ctx.font = `${peso} ${d}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    if (ctx.measureText(testo).width <= larghezzaMax) break;
    d -= 4;
  } while (d > 16);
  ctx.fillText(testo, LARGHEZZA / 2, y);
  return d;
}

/**
 * Scarica il cavalierino del tavolo come PNG stampabile.
 *
 * Il download precedente era il solo QR su fondo bianco: un ristoratore
 * doveva comunque passare da un grafico per farne qualcosa da mettere in
 * tavola. Qui esce un pezzo finito, con il marchio del locale.
 *
 * Disegnato su canvas nel browser e non sul server: comporre l'immagine
 * lato server richiederebbe una libreria di rendering e font installati,
 * per un risultato identico.
 */
export function ScaricaLocandina({ dati }: { dati: DatiLocandina }) {
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function genera() {
    setErrore(null);
    setInCorso(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = LARGHEZZA;
      canvas.height = ALTEZZA;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas non disponibile");

      const accento = dati.coloreMarchio || "#b4451f";

      // Fondo bianco: si stampa su carta, non su schermo.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA);

      // Fascia superiore nel colore del locale.
      ctx.fillStyle = accento;
      ctx.fillRect(0, 0, LARGHEZZA, 24);

      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      let y = 150;

      if (dati.logoUrl) {
        try {
          const logo = await caricaImmagine(dati.logoUrl);
          const lato = 190;
          const scala = Math.min(lato / logo.width, lato / logo.height);
          const w = logo.width * scala;
          const h = logo.height * scala;
          ctx.drawImage(logo, (LARGHEZZA - w) / 2, y - h / 2, w, h);
          y += lato / 2 + 70;
        } catch {
          // Logo illeggibile: si prosegue col solo nome, non si blocca la
          // stampa per un'immagine.
        }
      }

      ctx.fillStyle = "#1c1917";
      y += testoCentrato(ctx, dati.nomeLocale, y, 72, LARGHEZZA - 160) + 30;

      ctx.fillStyle = accento;
      testoCentrato(ctx, "SCAN NOW", y + 60, 96, LARGHEZZA - 160, "700");
      y += 130;

      ctx.fillStyle = "#57534e";
      testoCentrato(ctx, "Menu · Ordina · Paga", y + 60, 44, LARGHEZZA - 160, "400");
      y += 120;

      // --- QR ---------------------------------------------------------
      const qr = await caricaImmagine(dati.qrDataUrl);
      const latoQr = 660;
      const xQr = (LARGHEZZA - latoQr) / 2;
      const yQr = y + 40;

      // Cornice: aiuta a ritagliare dritto e stacca il QR dal bianco.
      ctx.strokeStyle = accento;
      ctx.lineWidth = 6;
      ctx.strokeRect(xQr - 28, yQr - 28, latoQr + 56, latoQr + 56);

      // Nitidezza: il QR è a blocchi, l'interpolazione lo sfoca e in stampa
      // piccola può renderlo illeggibile allo scanner.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qr, xQr, yQr, latoQr, latoQr);
      ctx.imageSmoothingEnabled = true;

      y = yQr + latoQr + 130;

      ctx.fillStyle = "#1c1917";
      testoCentrato(ctx, `Tavolo ${dati.codice}`, y, 64, LARGHEZZA - 160, "600");

      ctx.fillStyle = "#78716c";
      testoCentrato(
        ctx,
        "Inquadra con la fotocamera del telefono",
        y + 70,
        34,
        LARGHEZZA - 160,
        "400"
      );

      ctx.fillStyle = accento;
      ctx.fillRect(0, ALTEZZA - 24, LARGHEZZA, 24);

      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("Immagine non generata");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tavolo-${dati.codice}.png`;
      a.click();
      // Rilasciato dopo il click: revocarlo subito annullerebbe il download
      // su alcuni browser.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Non è stato possibile creare l'immagine");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={genera}
        disabled={inCorso}
        className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm disabled:opacity-50"
      >
        {inCorso ? "Preparo…" : "Scarica da stampare"}
      </button>
      <p className="mt-1 text-xs text-muted">
        PNG in formato A6 a 300 dpi, pronto per la tipografia.
      </p>
      {errore && <p className="mt-1 text-xs text-danger">{errore}</p>}
    </div>
  );
}
