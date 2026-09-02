import { test, expect } from "@playwright/test";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

const GUEST_URL = process.env.E2E_GUEST_URL ?? "http://localhost:3010";

let venue: TestVenue;

test.beforeAll(async () => {
  venue = await createTestVenue();
});

test.afterAll(async () => {
  await deleteTestVenue(venue);
});

test("il tavolo mostra il menu del locale", async ({ page }) => {
  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);

  await expect(page.getByRole("heading", { name: "E2E Test Venue" })).toBeVisible();
  await expect(page.getByText("Tavolo T1")).toBeVisible();
  await expect(page.getByText(venue.menuItemName)).toBeVisible();
  await expect(page.getByText("15,00 €").first()).toBeVisible();
});

test("un qr_token inesistente non apre nessun tavolo", async ({ page }) => {
  const res = await page.goto(`${GUEST_URL}/v/${venue.slug}/t/token-inventato`);
  expect(res?.status()).toBe(404);
});

test("ordine: aggiungi al carrello, invia, il conto si aggiorna", async ({ page }) => {
  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);

  // Il carrello compare solo dopo aver aggiunto qualcosa.
  await expect(page.getByRole("button", { name: "Ordina" })).toHaveCount(0);

  await page.getByRole("button", { name: /^Aggiungi / }).first().click();
  await page.getByRole("button", { name: /^Aggiungi / }).first().click();

  await expect(page.getByText("articoli")).toBeVisible();
  await expect(page.getByText("30,00 €")).toBeVisible();

  await page.getByRole("button", { name: "Ordina" }).click();
  await expect(page.getByText("Ordine inviato in cucina.")).toBeVisible();

  // Il totale del conto riflette l'ordine appena inviato (polling ogni 5s).
  await expect(page.getByText("Il conto")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("30,00 €").first()).toBeVisible();
});

test("senza metodi di pagamento configurati il conto lo dice esplicitamente", async ({ page }) => {
  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);

  await expect(
    page.getByText("Pagamento online non ancora attivo per questo locale")
  ).toBeVisible({ timeout: 15000 });
});

test("le pagine legali sono raggiungibili", async ({ page }) => {
  await page.goto(`${GUEST_URL}/privacy`);
  await expect(page.getByRole("heading", { name: "Informativa privacy" })).toBeVisible();

  await page.goto(`${GUEST_URL}/termini`);
  await expect(page.getByRole("heading", { name: "Termini di servizio" })).toBeVisible();
});
