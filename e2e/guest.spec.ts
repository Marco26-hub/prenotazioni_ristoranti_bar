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

test("il menu pubblico apre i dettagli e non contiene la prenotazione", async ({ page }) => {
  await page.goto(`${GUEST_URL}/m/${venue.slug}`);

  await expect(page.getByRole("heading", { name: "E2E Test Venue" })).toBeVisible();
  await expect(page.getByRole("link", { name: /prenota/i })).toHaveCount(0);

  await page.getByRole("button", { name: `Apri dettagli di ${venue.menuItemName}` }).click();
  await expect(page.getByRole("dialog", { name: venue.menuItemName })).toBeVisible();
  await page.getByRole("button", { name: "Chiudi dettagli" }).click();
  await expect(page.getByRole("dialog", { name: venue.menuItemName })).toHaveCount(0);
});

test("la pagina prenotazioni è separata e collega il menu", async ({ page }) => {
  await page.goto(`${GUEST_URL}/p/${venue.slug}`);

  await expect(page.getByRole("heading", { name: "Prenota da E2E Test Venue" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Prenota il tavolo" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Guarda il menu" })).toHaveAttribute(
    "href",
    `/m/${venue.slug}`
  );
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
