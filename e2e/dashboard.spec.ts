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
  await expect(page.getByText("E2E Test Venue")).toBeVisible();
  await expect(page.getByText(venue.email)).toBeVisible();
});

test("tutti i link di navigazione portano a una pagina che carica", async ({ page }) => {
  await login(page);

  const pages = [
    { link: "Ordini", heading: "Ordini in corso" },
    { link: "Menu", heading: "Menu" },
    { link: "QR e tavoli", heading: "Gestione tavoli" },
    { link: "Prenotazioni", heading: "Prenotazioni" },
    { link: "Impostazioni", heading: /^Impostazioni/ },
  ];

  for (const p of pages) {
    await page.getByRole("link", { name: p.link, exact: true }).click();
    // exact: altrimenti "Menu" matcha anche "Importa il menu da file".
    await expect(page.getByRole("heading", { name: p.heading, exact: true })).toBeVisible();
  }
});

test("il menu modifica il prezzo e duplica una voce completa", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Menu", exact: true }).click();

  // `exact` serve perché getByLabel cerca per sottostringa e l'etichetta del
  // bottone — "Salva prezzo di X" — contiene quella del campo.
  const price = page.getByRole("spinbutton", {
    name: `Prezzo di ${venue.menuItemName}`,
    exact: true,
  });
  await price.fill("17.50");
  await page.getByRole("button", { name: `Salva prezzo di ${venue.menuItemName}` }).click();
  await expect(price).toHaveValue("17.50");

  await page.getByRole("button", { name: `Duplica ${venue.menuItemName}` }).click();
  await expect(page.getByText(`Copia di ${venue.menuItemName}`, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("spinbutton", {
      name: `Prezzo di Copia di ${venue.menuItemName}`,
      exact: true,
    })
  ).toHaveValue("17.50");
});

test("il QR del tavolo punta all'app guest e apre quel tavolo", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "QR e tavoli", exact: true }).click();

  const qrUrl = page.getByText(new RegExp(`/v/${venue.slug}/t/`));
  await expect(qrUrl).toBeVisible();

  // Il link generato deve puntare davvero a una pagina tavolo funzionante.
  const url = (await qrUrl.textContent())!.trim();
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "E2E Test Venue" })).toBeVisible();
  await expect(page.getByText("Tavolo", { exact: true })).toBeVisible();
  await expect(page.getByText("T1", { exact: true })).toBeVisible();
});

test("un ordine inviato dal tavolo compare nella board cucina", async ({ page, context }) => {
  // Ordine dal lato cliente.
  const guest = await context.newPage();
  await guest.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);
  await guest.getByRole("button", { name: /^Aggiungi / }).first().click();
  await guest.getByRole("button", { name: "Ordina" }).click();
  await expect(guest.getByText("Ordine inviato in cucina.")).toBeVisible();
  await guest.close();

  // Deve arrivare in cucina (la board fa polling ogni 4s).
  await login(page);
  await page.getByRole("link", { name: "Ordini", exact: true }).click();
  await expect(page.getByText(`1× ${venue.menuItemName}`)).toBeVisible({ timeout: 15000 });
  // Il bottone dice dove porta, non dove sta: su una comanda ancora in coda
  // l'azione disponibile è metterla in preparazione.
  await expect(
    page.getByRole("button", { name: /Metti in preparazione/ }).first()
  ).toBeVisible();
});

test("lo stato di una comanda avanza e resta salvato", async ({ page, context }) => {
  const guest = await context.newPage();
  await guest.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);
  await guest.getByRole("button", { name: /^Aggiungi / }).first().click();
  await guest.getByRole("button", { name: "Ordina" }).click();
  await expect(guest.getByText("Ordine inviato in cucina.")).toBeVisible();
  await guest.close();

  await login(page);
  await page.getByRole("link", { name: "Ordini", exact: true }).click();

  // La board raggruppa per tavolo e offre l'azione di gruppo: è il gesto
  // che si usa davvero in cucina, quindi è quello che il test esercita.
  await page
    .getByRole("button", { name: /Tutto in preparazione/ })
    .first()
    .click();
  // Portata in preparazione, l'azione successiva diventa "segna pronto":
  // è così che si legge lo stato dalla board.
  await expect(
    page.getByRole("button", { name: /Segna pronto/ }).first()
  ).toBeVisible({ timeout: 15000 });

  // Ricaricando, lo stato deve venire dal DB, non solo dallo state locale.
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Segna pronto/ }).first()
  ).toBeVisible({ timeout: 15000 });
});
