"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireRole } from "@/lib/authz";

export interface ImportResult {
  error?: string;
  imported?: number;
  skipped?: string[];
}

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_ROWS = 500;

/**
 * Parser CSV/TSV minimo ma corretto sui casi che capitano davvero in un menu:
 * campi tra virgolette che contengono virgole ("Filetto, salsa al pepe") e
 * virgolette raddoppiate al loro interno. Evita una dipendenza per ~30 righe.
 * Il separatore è riconosciuto da solo: virgola, punto e virgola o tab —
 * Excel in italiano esporta col punto e virgola, non con la virgola.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') inQuotes = true;
    else if (c === "," || c === ";" || c === "\t") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/**
 * Accetta "12,50", "12.50" e "1.234,56".
 *
 * Se c'è una virgola è lei il separatore decimale e i punti sono migliaia
 * (notazione italiana): senza questa distinzione "1.234,56" verrebbe letto
 * come 1,23 €. Senza virgola il punto è decimale, che è come esportano
 * Excel e i gestionali in inglese.
 */
function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;

  const normalised = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;

  const value = Number.parseFloat(normalised);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** Legge la prima scheda di un .xlsx nella stessa forma del CSV. */
async function readXlsx(file: File): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    // values[0] non è una cella: ExcelJS numera le colonne da 1.
    for (let i = 1; i <= sheet.columnCount; i++) {
      const v = row.getCell(i).value;
      cells.push(v === null || v === undefined ? "" : String(v).trim());
    }
    if (cells.some((c) => c !== "")) rows.push(cells);
  });
  return rows;
}

export async function importMenuCsv(formData: FormData): Promise<ImportResult> {
  const { venue } = await requireRole(["owner", "manager"]);
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Nessun file selezionato" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "File troppo grande (massimo 1 MB)" };
  }

  const isExcel =
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.type.includes("spreadsheetml");

  let rows: string[][];
  try {
    rows = isExcel ? await readXlsx(file) : parseCsv(await file.text());
  } catch (err) {
    console.error("[import-menu] lettura file fallita:", err);
    return { error: "File non leggibile: controlla che sia un CSV, TSV o Excel valido" };
  }
  if (rows.length === 0) return { error: "Il file è vuoto" };

  // La prima riga è intestazione solo se non contiene un prezzo valido:
  // così funziona sia con file esportati con intestazione sia senza.
  const hasHeader = parsePrice(rows[0][2] ?? "") === null;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  if (dataRows.length > MAX_ROWS) {
    return { error: `Troppe righe (massimo ${MAX_ROWS})` };
  }

  const sql = db();
  const existing = await sql<{ id: string; name: string }[]>`
    select id, name from menu_categories where venue_id = ${venue.venueId}`;
  const categoryByName = new Map(existing.map((c) => [c.name.toLowerCase(), c.id]));

  const skipped: string[] = [];
  let imported = 0;

  for (const [index, cols] of dataRows.entries()) {
    const lineNo = index + (hasHeader ? 2 : 1);
    const categoryName = (cols[0] ?? "").trim();
    const name = (cols[1] ?? "").trim();
    const priceCents = parsePrice(cols[2] ?? "");
    const description = (cols[3] ?? "").trim() || null;
    const vatRaw = (cols[4] ?? "").trim();
    const vatRate = vatRaw ? Number.parseFloat(vatRaw.replace(",", ".")) : 10;

    if (!name) {
      skipped.push(`riga ${lineNo}: manca il nome del piatto`);
      continue;
    }
    if (priceCents === null) {
      skipped.push(`riga ${lineNo} (${name}): prezzo non valido`);
      continue;
    }
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) {
      skipped.push(`riga ${lineNo} (${name}): IVA non valida`);
      continue;
    }

    let categoryId: string | null = null;
    if (categoryName) {
      const key = categoryName.toLowerCase();
      categoryId = categoryByName.get(key) ?? null;
      if (!categoryId) {
        const [created] = await sql<{ id: string }[]>`
          insert into menu_categories (venue_id, name, sort_order)
          values (${venue.venueId}, ${categoryName}, ${categoryByName.size + 1})
          returning id`;
        categoryId = created.id;
        categoryByName.set(key, categoryId);
      }
    }

    await sql`
      insert into menu_items (venue_id, category_id, name, description, price_cents, vat_rate, sort_order)
      values (${venue.venueId}, ${categoryId}, ${name}, ${description},
              ${priceCents}, ${vatRate}, ${index + 1})`;
    imported++;
  }

  revalidatePath("/dashboard/menu");
  return { imported, skipped };
}
