/**
 * Il cavalierino da tavolo: disegno e PDF.
 *
 * Estratto dal componente perché ora serve a due bottoni — il singolo tavolo
 * e il PDF di tutta la sala — e due copie dello stesso disegno divergono al
 * primo ritocco, lasciando in tipografia due file diversi.
 *
 * Disegnato su canvas nel browser e non sul server: comporre l'immagine lato
 * server richiederebbe una libreria di rendering e i font installati, per un
 * risultato identico.
 */

/** A6 a 300 dpi: la misura che una tipografia accetta senza chiedere altro. */
export const LARGHEZZA = 1240;
export const ALTEZZA = 1748;

/** A6 in millimetri, e l'abbondanza che ogni tipografia si aspetta. */
export const A6_MM = { w: 105, h: 148 };
export const ABBONDANZA_MM = 3;

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

export async function disegnaLocandina(
  dati: DatiLocandina
): Promise<HTMLCanvasElement> {

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

      return canvas;
}

/**
 * Un PDF pronto per lo stampatore, una pagina per tavolo.
 *
 * Pagina dichiarata, 3 mm di abbondanza per lato e crocini: senza
 * abbondanza un millimetro di scarto della taglierina lascia un filo bianco
 * sul bordo del cavalierino.
 */
export async function pdfLocandine(
  elenco: DatiLocandina[],
  suProgresso?: (fatti: number, totale: number) => void
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");

  const pagina = {
    w: A6_MM.w + ABBONDANZA_MM * 2,
    h: A6_MM.h + ABBONDANZA_MM * 2,
  };
  const pdf = new jsPDF({ unit: "mm", format: [pagina.w, pagina.h] });

  for (let i = 0; i < elenco.length; i++) {
    if (i > 0) pdf.addPage([pagina.w, pagina.h]);

    const canvas = await disegnaLocandina(elenco[i]);
    // L'immagine copre anche l'abbondanza: il fondo si estende oltre il
    // taglio, che è esattamente lo scopo.
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.95),
      "JPEG",
      0,
      0,
      pagina.w,
      pagina.h
    );

    // Crocini fuori dall'area di taglio, come si usa.
    pdf.setLineWidth(0.1);
    pdf.setDrawColor(0);
    const b = ABBONDANZA_MM;
    const l = 2;
    for (const [x, y, dx, dy] of [
      [b, 0, 0, l], [0, b, l, 0],
      [pagina.w - b, 0, 0, l], [pagina.w, b, -l, 0],
      [b, pagina.h, 0, -l], [0, pagina.h - b, l, 0],
      [pagina.w - b, pagina.h, 0, -l], [pagina.w, pagina.h - b, -l, 0],
    ]) {
      pdf.line(x, y, x + dx, y + dy);
    }

    suProgresso?.(i + 1, elenco.length);
  }

  return pdf.output("blob");
}

export function scarica(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  // Rilasciato dopo il click: revocarlo subito annullerebbe il download su
  // alcuni browser.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
