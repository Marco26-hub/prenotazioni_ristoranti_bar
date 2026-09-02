import { test, expect } from "@playwright/test";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

const DASHBOARD_URL = process.env.E2E_DASHBOARD_URL ?? "http://localhost:3011";
const GUEST_URL = process.env.E2E_GUEST_URL ?? "http://localhost:3010";

let venue: TestVenue;

test.beforeAll(async () => {
  venue = await createTestVenue();
});

test.afterAll(async () => {
  await deleteTestVenue(venue);
});

async function login(page: import("@playwright/test").Page) {
  await page.goto(`${DASHBOARD_URL}/login`);
  await page.locator('input[type="email"]').waitFor();
  await page.locator('input[type="email"]').fill(venue.email);
  await page.locator('input[type="password"]').fill(venue.password);
  await page.getByRole("button", { name: "Accedi" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test("la nota del cliente arriva in cucina", async ({ page, context }) => {
  const guest = await context.newPage();
  await guest.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);

  await guest.getByRole("button", { name: /^Aggiungi / }).first().click();
  await guest.getByRole("button", { name: "Aggiungi una nota" }).click();
  await guest.getByPlaceholder("Es. senza cipolla, senza glutine").fill("senza glutine");
  await guest.getByRole("button", { name: "Ordina" }).click();
  await expect(guest.getByText("Ordine inviato in cucina.")).toBeVisible();
  await guest.close();

  await login(page);
  await page.goto(`${DASHBOARD_URL}/dashboard/orders`);
  await expect(page.getByText("senza glutine")).toBeVisible({ timeout: 15000 });

  // Deve comparire anche sulla comanda da stampare.
  await page.goto(`${DASHBOARD_URL}/dashboard/orders/stampa`);
  await expect(page.getByText("senza glutine")).toBeVisible();
});

test("la nota sopravvive all'aumento di quantità", async ({ page }) => {
  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);

  await page.getByRole("button", { name: /^Aggiungi / }).first().click();
  await page.getByRole("button", { name: "Aggiungi una nota" }).click();
  await page.getByPlaceholder("Es. senza cipolla, senza glutine").fill("ben cotta");

  await page.getByRole("button", { name: /^Aggiungi / }).first().click();
  await expect(page.getByPlaceholder("Es. senza cipolla, senza glutine")).toHaveValue("ben cotta");
});

test("lo staff può chiudere un conto pagato al banco", async ({ page, context }) => {
  const guest = await context.newPage();
  await guest.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);
  await guest.getByRole("button", { name: /^Aggiungi / }).first().click();
  await guest.getByRole("button", { name: "Ordina" }).click();
  await expect(guest.getByText("Ordine inviato in cucina.")).toBeVisible();
  await guest.close();

  await login(page);
  await expect(page.getByRole("button", { name: "Chiudi conto" })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Chiudi conto" }).first().click();

  // Il tavolo torna libero e il bottone sparisce.
  await expect(page.getByText("libero").first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: "Chiudi conto" })).toHaveCount(0);

  // L'incasso deve comunque risultare nello storico di giornata.
  await page.goto(`${DASHBOARD_URL}/dashboard/orders/storico`);
  await expect(page.getByText("Incassato")).toBeVisible();
});
