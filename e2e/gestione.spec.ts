import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

const DASHBOARD_URL = process.env.E2E_DASHBOARD_URL ?? "http://localhost:3011";
const GUEST_URL = process.env.E2E_GUEST_URL ?? "http://localhost:3010";

let venue: TestVenue;

/*
 * Un locale per test, non uno per file.
 *
 * Condividendolo, ogni test lascia al successivo i suoi tavoli aperti e le
 * sue comande: i bottoni presi con .first() finiscono su un altro tavolo e i
 * conteggi dipendono dall'ordine di esecuzione. Fallivano in fila e passavano
 * da soli, cioe accusavano il codice di cose che non aveva fatto.
 */
test.beforeEach(async () => {
  venue = await createTestVenue();
});

test.afterEach(async () => {
  await deleteTestVenue(venue);
});

async function login(page: import("@playwright/test").Page, password = venue.password) {
  await page.goto(`${DASHBOARD_URL}/login`);
  await page.locator('input[type="email"]').waitFor();
  await page.locator('input[type="email"]').fill(venue.email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Accedi" }).click();
  /*
   * Non si aspetta l'URL: l'host di produzione si chiama
   * ristoranti-dashboard, quindi /dashboard/ combacia già stando fermi sulla
   * maschera di accesso e login() tornava prima che l'accesso fosse
   * avvenuto. Il test proseguiva sulla pagina sbagliata e falliva più avanti,
   * in modo intermittente e lontano dalla causa. Si aspetta invece qualcosa
   * che esiste solo da dentro.
   */
  await page.getByRole("button", { name: /^Esci$/i }).waitFor({
    state: "visible",
    timeout: 20_000,
  });
}

test("rigenerando il QR il vecchio link smette di funzionare", async ({ page, request }) => {
  const oldUrl = `${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`;
  expect((await request.get(oldUrl)).status()).toBe(200);

  await login(page);
  await page.goto(`${DASHBOARD_URL}/dashboard/tables`);
  await page.getByRole("button", { name: "Rigenera QR" }).first().click();
  await expect(page.getByText(venue.qrToken)).toHaveCount(0, { timeout: 15000 });

  // Il QR stampato in precedenza non deve più aprire il tavolo.
  expect((await request.get(oldUrl)).status()).toBe(404);

  // Quello nuovo mostrato in dashboard sì.
  const newUrl = (await page.getByText(new RegExp(`/v/${venue.slug}/t/`)).textContent())!.trim();
  expect(newUrl).not.toBe(oldUrl);
  expect((await request.get(newUrl)).status()).toBe(200);

  // La fixture è condivisa dai test successivi: senza questo continuerebbero
  // a usare il token appena invalidato e fallirebbero con un 404.
  venue.qrToken = newUrl.split("/t/")[1];
});

test("modifica di codice e posti del tavolo viene salvata", async ({ page }) => {
  await login(page);
  await page.goto(`${DASHBOARD_URL}/dashboard/tables`);

  await page.locator('input[name="code"]').first().fill("Dehors");
  await page.locator('input[name="seats"]').first().fill("8");
  await page.getByRole("button", { name: "Salva" }).first().click();

  await expect(page.getByText("Tavolo Dehors — 8 posti")).toBeVisible({ timeout: 15000 });

  await page.reload();
  await expect(page.getByText("Tavolo Dehors — 8 posti")).toBeVisible();
});

test("la pagina di stampa comande elenca gli ordini aperti", async ({ page, context }) => {
  const guest = await context.newPage();
  await guest.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);
  await guest.getByRole("button", { name: /^Aggiungi / }).first().click();
  await guest.getByRole("button", { name: "Ordina" }).click();
  await expect(guest.getByText("Ordine inviato in cucina.")).toBeVisible();
  await guest.close();

  await login(page);
  await page.goto(`${DASHBOARD_URL}/dashboard/orders/stampa`);

  await expect(page.getByText(venue.menuItemName)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: "Stampa" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Torna agli ordini in corso" })).toHaveAttribute(
    "href",
    "/dashboard/orders"
  );
  await expect(page.getByText(/Comanda #[A-F0-9]{8}/)).toBeVisible();
  await expect(page.getByText("In coda", { exact: true })).toBeVisible();
});

test("cambio password: rifiuta quella attuale sbagliata, poi funziona", async ({ page }) => {
  await login(page);
  await page.goto(`${DASHBOARD_URL}/dashboard/settings`);

  await page.locator('input[name="currentPassword"]').fill("password-sbagliata");
  await page.locator('input[name="newPassword"]').fill("nuova-password-e2e");
  await page.locator('input[name="confirmPassword"]').fill("nuova-password-e2e");
  await page.getByRole("button", { name: "Cambia password" }).click();
  await expect(page.getByText("Password attuale non corretta")).toBeVisible();

  await page.locator('input[name="currentPassword"]').fill(venue.password);
  await page.locator('input[name="newPassword"]').fill("nuova-password-e2e");
  await page.locator('input[name="confirmPassword"]').fill("nuova-password-e2e");
  await page.getByRole("button", { name: "Cambia password" }).click();
  await expect(page.getByText("Password aggiornata.")).toBeVisible();

  // La nuova password deve valere davvero al login successivo.
  await page.goto(`${DASHBOARD_URL}/login`);
  await login(page, "nuova-password-e2e");
  await expect(page.getByText("E2E Test Venue")).toBeVisible();

  venue.password = "nuova-password-e2e";
});

test("la registrazione crea locale, tavoli e categorie", async ({ page }) => {
  const suffix = Math.random().toString(36).slice(2, 8);
  const email = `e2e-signup-${suffix}@test.local`;
  const name = `E2E Signup ${suffix}`;

  // La registrazione ha un rate limit di 5/ora per IP. È corretto in
  // produzione, ma in locale tutte le esecuzioni condividono lo stesso IP e
  // dopo cinque run il test fallirebbe per il limite, non per un difetto.
  const reset = postgres(process.env.DATABASE_URL!, { ssl: "require", prepare: false });
  try {
    await reset`delete from rate_limits where bucket_key like 'signup:%'`;
  } finally {
    await reset.end();
  }

  await page.goto(`${DASHBOARD_URL}/registrati`);
  await page.locator('input[name="venueName"]').fill(name);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("password-e2e-123");
  await page.locator('input[name="tableCount"]').fill("2");
  // Senza l'accordo art. 28 la registrazione viene rifiutata lato server:
  // spuntarla fa parte del percorso, non è un dettaglio del modulo.
  await page.locator('input[name="dpa"]').check();
  await page.getByRole("button", { name: "Crea locale" }).click();

  await expect(page.getByRole("heading", { name: "Locale creato" })).toBeVisible({
    timeout: 20000,
  });

  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", prepare: false });
  try {
    const [created] = await sql<{ id: string; owner_id: string; dpa_version: string | null }[]>`
      select id, owner_id, dpa_version from venues where name = ${name}`;
    expect(created).toBeTruthy();
    // L'accettazione deve restare scritta: senza versione registrata non si
    // saprebbe a quale testo dell'accordo il locale ha aderito.
    expect(created.dpa_version).toBeTruthy();

    const [tables] = await sql<{ n: number }[]>`
      select count(*)::int as n from tables where venue_id = ${created.id}`;
    expect(tables.n).toBe(2);

    const [cats] = await sql<{ n: number }[]>`
      select count(*)::int as n from menu_categories where venue_id = ${created.id}`;
    expect(cats.n).toBeGreaterThan(0);

    await sql`delete from menu_categories where venue_id = ${created.id}`;
    await sql`delete from tables where venue_id = ${created.id}`;
    await sql`delete from venue_staff where venue_id = ${created.id}`;
    await sql`delete from venues where id = ${created.id}`;
    await sql`delete from users where id = ${created.owner_id}`;
  } finally {
    await sql.end();
  }
});
