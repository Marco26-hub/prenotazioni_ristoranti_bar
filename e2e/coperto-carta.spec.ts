import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

/**
 * Coperto e servizio sulla carta esposta.
 *
 * La norma sui prezzi mette il coperto alla pari di un piatto (R.D. 635/1940
 * art. 180): va scritto dove il cliente sceglie. La pagina del tavolo lo
 * faceva già; la carta pubblica `/m/[slug]` no — ed è quella che a un
 * controllo vale come listino esposto, perché è pubblica e indicizzata.
 */

const GUEST_URL = process.env.E2E_GUEST_URL ?? "http://localhost:3010";

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL mancante per i test E2E");
  return postgres(url, { ssl: "require", prepare: false });
}

let venue: TestVenue;

test.beforeEach(async () => {
  venue = await createTestVenue();
});

test.afterEach(async () => {
  await deleteTestVenue(venue);
});

async function conSupplementi(coperto: number, servizio: number, etichetta?: string) {
  const sql = db();
  try {
    await sql`
      update venues
         set cover_charge_cents = ${coperto},
             service_percent = ${servizio},
             cover_charge_label = ${etichetta ?? null}
       where id = ${venue.venueId}`;
  } finally {
    await sql.end();
  }
}

test("la carta pubblica dichiara coperto e servizio", async ({ page }) => {
  await conSupplementi(250, 10);

  await page.goto(`${GUEST_URL}/m/${venue.slug}`);

  await expect(page.getByText(/Coperto 2,50\s*€ a persona/i)).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/Servizio 10% sull'ordinato/i)).toBeVisible();
});

test("e li dichiara anche in inglese", async ({ browser }) => {
  await conSupplementi(250, 10);

  const contesto = await browser.newContext({ locale: "en-GB" });
  const page = await contesto.newPage();
  await page.goto(`${GUEST_URL}/m/${venue.slug}`);

  await expect(page.getByText(/Cover charge €2\.50 per person/i)).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/Service charge 10% on the order/i)).toBeVisible();

  await contesto.close();
});

test("il nome che il locale ha dato al coperto vince sul nostro", async ({ page }) => {
  await conSupplementi(200, 0, "Pane e coperto");

  await page.goto(`${GUEST_URL}/m/${venue.slug}`);

  await expect(page.getByText(/Pane e coperto 2,00\s*€ a persona/i)).toBeVisible({
    timeout: 20_000,
  });
  // Servizio a zero: non si scrive una riga che dice "0%".
  await expect(page.getByText(/Servizio 0%/i)).toHaveCount(0);
});

test("chi non applica né coperto né servizio non vede nessuna riga", async ({
  page,
}) => {
  await conSupplementi(0, 0);

  await page.goto(`${GUEST_URL}/m/${venue.slug}`);
  await expect(page.getByText(venue.menuItemName).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/a persona|per person/i)).toHaveCount(0);
});
