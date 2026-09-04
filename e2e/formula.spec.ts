import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

/**
 * La formula a prezzo fisso: si paga a persona, non a piatto.
 *
 * È l'aritmetica del conto, quindi va difesa dove il cliente la legge e non
 * solo nella funzione che la calcola: un errore qui non dà nessun errore,
 * dà un numero plausibile e sbagliato che qualcuno paga.
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

test("a formula il conto è per persona e i piatti compresi non si sommano", async ({
  page,
}) => {
  const sql = db();

  try {
    // 30 € a persona a cena, e il tavolo si è seduto a cena.
    await sql`
      update venues set formula_attiva = true, formula_predefinita = true,
                        formula_cena_cents = 3000, formula_pranzo_cents = 2000,
                        formula_ora_cena = '00:00'
       where id = ${venue.venueId}`;

    await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);

    // Il piatto compreso non mostra un prezzo: mostrarlo farebbe credere
    // che si paghi a parte.
    await expect(page.getByText("Compreso nella formula").first()).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: /^Aggiungi / }).first().click();
    await page.getByRole("button", { name: "Ordina" }).click();
    await expect(page.getByText("Ordine inviato in cucina.")).toBeVisible({
      timeout: 20_000,
    });

    const [s] = await sql<{ id: string }[]>`
      select ts.id from table_sessions ts
        join tables t on t.id = ts.table_id
       where t.qr_token = ${venue.qrToken} and ts.status = 'open'
       order by ts.opened_at desc limit 1`;

    // Quattro persone, di cui un bambino gratis: 3 × 30 = 90 €. Il piatto
    // ordinato è compreso e non si somma.
    await sql`
      update venues set formula_bambino_cents = 0 where id = ${venue.venueId}`;
    await sql`
      update table_sessions set guest_count = 4, bambini = 1 where id = ${s.id}`;

    const conto = await page.evaluate(async (sessionId) => {
      const r = await fetch(`/api/bill?sessionId=${sessionId}`);
      return r.json();
    }, s.id);

    expect(conto.formula).toMatchObject({ adulti: 3, bambini: 1 });
    expect(conto.balanceCents).toBe(9000);
  } finally {
    await sql.end();
  }
});

test("le voci fuori formula si pagano oltre al prezzo a persona", async ({ page }) => {
  const sql = db();

  try {
    await sql`
      update venues set formula_attiva = true, formula_predefinita = true,
                        formula_cena_cents = 3000, formula_pranzo_cents = 3000
       where id = ${venue.venueId}`;

    // Il piatto del locale di prova diventa un extra: un caffè, un amaro.
    await sql`
      update menu_items set fuori_formula = true where venue_id = ${venue.venueId}`;

    await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);
    await expect(page.getByText("fuori formula").first()).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: /^Aggiungi / }).first().click();
    await page.getByRole("button", { name: "Ordina" }).click();
    await expect(page.getByText("Ordine inviato in cucina.")).toBeVisible({
      timeout: 20_000,
    });

    const [s] = await sql<{ id: string }[]>`
      select ts.id from table_sessions ts
        join tables t on t.id = ts.table_id
       where t.qr_token = ${venue.qrToken} and ts.status = 'open'
       order by ts.opened_at desc limit 1`;

    const conto = await page.evaluate(async (sessionId) => {
      const r = await fetch(`/api/bill?sessionId=${sessionId}`);
      return r.json();
    }, s.id);

    // Una persona a 30 € più il piatto fuori formula al suo prezzo.
    expect(conto.balanceCents).toBe(3000 + venue.menuItemPriceCents);
  } finally {
    await sql.end();
  }
});

test("alla carta la formula non tocca il conto", async ({ page }) => {
  const sql = db();

  try {
    // Il locale la propone, ma questo tavolo no.
    await sql`
      update venues set formula_attiva = true, formula_predefinita = false,
                        formula_cena_cents = 3000
       where id = ${venue.venueId}`;

    await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);
    await page.getByRole("button", { name: /^Aggiungi / }).first().click();
    await page.getByRole("button", { name: "Ordina" }).click();
    await expect(page.getByText("Ordine inviato in cucina.")).toBeVisible({
      timeout: 20_000,
    });

    const [s] = await sql<{ id: string }[]>`
      select ts.id from table_sessions ts
        join tables t on t.id = ts.table_id
       where t.qr_token = ${venue.qrToken} and ts.status = 'open'
       order by ts.opened_at desc limit 1`;

    const conto = await page.evaluate(async (sessionId) => {
      const r = await fetch(`/api/bill?sessionId=${sessionId}`);
      return r.json();
    }, s.id);

    expect(conto.formula).toBeNull();
    expect(conto.balanceCents).toBe(venue.menuItemPriceCents);
  } finally {
    await sql.end();
  }
});

test("a formula il servizio si calcola su quello che si paga, non sui piatti compresi", async ({
  page,
}) => {
  const sql = db();

  try {
    // 30 € a persona, 10% di servizio, e un extra fuori formula.
    await sql`
      update venues set formula_attiva = true, formula_predefinita = true,
                        formula_cena_cents = 3000, formula_pranzo_cents = 3000,
                        service_percent = 10, cover_charge_cents = 0
       where id = ${venue.venueId}`;

    await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);
    await page.getByRole("button", { name: /^Aggiungi / }).first().click();
    await page.getByRole("button", { name: "Ordina" }).click();
    await expect(page.getByText("Ordine inviato in cucina.")).toBeVisible({
      timeout: 20_000,
    });

    const [s] = await sql<{ id: string }[]>`
      select ts.id from table_sessions ts
        join tables t on t.id = ts.table_id
       where t.qr_token = ${venue.qrToken} and ts.status = 'open'
       order by ts.opened_at desc limit 1`;

    const conto = await page.evaluate(async (sessionId) => {
      const r = await fetch(`/api/bill?sessionId=${sessionId}`);
      return r.json();
    }, s.id);

    /*
     * Il piatto ordinato è compreso, quindi la base del servizio è la sola
     * formula: 30 € + 10% = 33 €. Calcolandolo sull'ordinato pieno darebbe
     * una percentuale su un piatto che nessuno paga.
     */
    expect(conto.balanceCents).toBe(3300);
    expect(conto.servizio?.totaleCents).toBe(300);
  } finally {
    await sql.end();
  }
});
