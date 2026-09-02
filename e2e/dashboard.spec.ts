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

test("una rotta protetta rimanda al login se non autenticati", async ({ page }) => {
  await page.goto(`${DASHBOARD_URL}/dashboard`);
  await expect(page.getByRole("heading", { name: "Accesso staff" })).toBeVisible();
});

test("password sbagliata viene rifiutata", async ({ page }) => {
  await page.goto(`${DASHBOARD_URL}/login`);
  await page.locator('input[type="email"]').fill(venue.email);
  await page.locator('input[type="password"]').fill("password-sbagliata");
  await page.getByRole("button", { name: "Accedi" }).click();

  await expect(page.getByText("Email o password non corretti")).toBeVisible();
  expect(page.url()).toContain("/login");
});

test("login corretto porta alla dashboard del proprio locale", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "E2E Test Venue" })).toBeVisible();
  await expect(page.getByText(venue.email)).toBeVisible();
});

test("tutti i link di navigazione portano a una pagina che carica", async ({ page }) => {
  await login(page);

  const pages = [
    { link: "Ordini", heading: "Ordini in corso" },
    { link: "Menu", heading: "Menu" },
    { link: "Gestione tavoli", heading: "Gestione tavoli" },
    { link: "Prenotazioni", heading: "Prenotazioni" },
    { link: "Impostazioni", heading: /Impostazioni/ },
  ];

  for (const p of pages) {
    await page.getByRole("link", { name: p.link, exact: true }).click();
    await expect(page.getByRole("heading", { name: p.heading })).toBeVisible();
  }
});

test("il QR del tavolo punta all'app guest e apre quel tavolo", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Gestione tavoli", exact: true }).click();

  const qrUrl = page.getByText(new RegExp(`/v/${venue.slug}/t/`));
  await expect(qrUrl).toBeVisible();

  // Il link generato deve puntare davvero a una pagina tavolo funzionante.
  const url = (await qrUrl.textContent())!.trim();
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "E2E Test Venue" })).toBeVisible();
  await expect(page.getByText("Tavolo T1")).toBeVisible();
});

test("un ordine inviato dal tavolo compare nella board cucina", async ({ page, context }) => {
  // Ordine dal lato cliente.
  const guest = await context.newPage();
  await guest.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);
  await guest.getByRole("button", { name: "+" }).first().click();
  await guest.getByRole("button", { name: "Ordina" }).click();
  await expect(guest.getByText("Ordine inviato in cucina.")).toBeVisible();
  await guest.close();

  // Deve arrivare in cucina (la board fa polling ogni 4s).
  await login(page);
  await page.getByRole("link", { name: "Ordini", exact: true }).click();
  await expect(page.getByText(`1× ${venue.menuItemName}`)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Da preparare")).toBeVisible();
});

test("lo stato di una comanda avanza e resta salvato", async ({ page, context }) => {
  const guest = await context.newPage();
  await guest.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);
  await guest.getByRole("button", { name: "+" }).first().click();
  await guest.getByRole("button", { name: "Ordina" }).click();
  await expect(guest.getByText("Ordine inviato in cucina.")).toBeVisible();
  await guest.close();

  await login(page);
  await page.getByRole("link", { name: "Ordini", exact: true }).click();

  await page.getByRole("button", { name: /Segna: In preparazione/ }).first().click();
  await expect(page.getByText("In preparazione").first()).toBeVisible();

  // Ricaricando, lo stato deve venire dal DB, non solo dallo state locale.
  await page.reload();
  await expect(page.getByText("In preparazione").first()).toBeVisible({ timeout: 15000 });
});
