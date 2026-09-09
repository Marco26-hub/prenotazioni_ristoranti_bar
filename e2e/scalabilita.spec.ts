import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

const DASHBOARD_URL = process.env.E2E_DASHBOARD_URL ?? "http://localhost:3011";

let venue: TestVenue;

test.beforeEach(async () => {
  venue = await createTestVenue();
  const sql = postgres(process.env.DATABASE_URL!, {
    ssl: "require",
    prepare: false,
  });
  try {
    const tavoli = Array.from({ length: 199 }, (_, indice) => {
      const numero = indice + 2;
      return {
        code: `T${numero}`,
        seats: numero % 5 === 0 ? 6 : 4,
        zone: ["Sala A", "Sala B", "Dehors"][numero % 3],
      };
    });
    await sql`
      insert into tables (venue_id, code, seats, zone)
      select ${venue.venueId}, x.code, x.seats, x.zone
        from jsonb_to_recordset(${sql.json(tavoli)}::jsonb)
          as x(code text, seats integer, zone text)`;
  } finally {
    await sql.end();
  }
});

test.afterEach(async () => {
  await deleteTestVenue(venue);
});

async function login(page: import("@playwright/test").Page) {
  await page.goto(`${DASHBOARD_URL}/login`);
  await page.locator('input[type="email"]').fill(venue.email);
  await page.locator('input[type="password"]').fill(venue.password);
  await page.getByRole("button", { name: /Accedi|Sign in|Log in/i }).click();
  await page.getByRole("button", { name: /^(Esci|Sign out|Log out)$/i }).waitFor({
    timeout: 20_000,
  });
}

test("200 tavoli restano ordinati, filtrabili per sala e salvabili in blocco", async ({
  page,
}) => {
  const iniziato = Date.now();
  await login(page);

  await expect(page.getByText(/0 di 200 occupati|0 of 200 occupied/i)).toBeVisible();
  expect(Date.now() - iniziato).toBeLessThan(20_000);

  await page.getByRole("button", { name: "Sala A", exact: true }).click();
  const etichette = await page
    .locator('button[aria-label^="Apri T"], button[aria-label^="Open T"]')
    .evaluateAll((bottoni) => bottoni.map((b) => b.getAttribute("aria-label") ?? ""));
  const puliti = etichette
    .map((etichetta) => etichetta.match(/T\d+/)?.[0] ?? "")
    .filter(Boolean);
  expect(puliti.indexOf("T3")).toBeLessThan(puliti.indexOf("T12"));

  await page.getByRole("button", { name: /Disponi la sala|Arrange the floor/i }).click();
  await page.getByRole("button", { name: /Riordina T1, T2, T3|Sort T1, T2, T3/i }).click();
  await page.getByRole("button", { name: /Salva disposizione|Save layout/i }).click();
  await expect(page.getByRole("status")).toContainText(/Sala salvata|Floor saved/i);

  await page.getByRole("button", { name: /Tutti \(200\)|All \(200\)/i }).click();
  await expect(page.getByText("T200", { exact: true }).last()).toBeVisible();
});
