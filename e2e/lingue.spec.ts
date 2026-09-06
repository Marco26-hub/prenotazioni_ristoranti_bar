import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

/**
 * L'inglese, dove conta.
 *
 * Non serve verificare che ogni stringa sia tradotta — quello lo garantisce
 * il tipo `Speculare`, che non fa compilare un dizionario incompleto. Serve
 * verificare le tre cose che il tipo non vede: che la lingua venga scelta
 * senza che il cliente tocchi niente, che sopravviva da una pagina all'altra,
 * e che arrivi fino ai posti dove non c'è più una richiesta da cui dedurla —
 * le email, il conto, gli errori.
 *
 * Il caso vero è il turista: inquadra il QR, il telefono è in inglese, e
 * quello che vede decide se ordina o chiama il cameriere.
 */

const GUEST_URL = process.env.E2E_GUEST_URL ?? "http://localhost:3010";
const DASHBOARD_URL = process.env.E2E_DASHBOARD_URL ?? "http://localhost:3011";

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

test("il telefono in inglese apre il menu del tavolo in inglese, senza toccare niente", async ({
  browser,
}) => {
  // Il caso che conta: nessun `?lang=`, nessun cookie. Solo un telefono
  // impostato in inglese, che è come arriva davvero un turista.
  const contesto = await browser.newContext({ locale: "en-GB" });
  const page = await contesto.newPage();

  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  // "Tavolo" è la parola che sta sempre in cima, accanto al numero.
  await expect(page.getByText(/^Table$/i).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Tavolo/)).toHaveCount(0);

  await contesto.close();
});

test("il telefono in italiano resta in italiano", async ({ browser }) => {
  const contesto = await browser.newContext({ locale: "it-IT" });
  const page = await contesto.newPage();

  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);

  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page.getByText(/Tavolo/).first()).toBeVisible({ timeout: 20_000 });

  await contesto.close();
});

test("la scelta esplicita batte il telefono e si ricorda alla pagina dopo", async ({
  browser,
}) => {
  // Telefono italiano, ma il cliente sceglie l'inglese: da lì in poi deve
  // restare inglese anche cambiando pagina, senza rimettere `?lang=`.
  const contesto = await browser.newContext({ locale: "it-IT" });
  const page = await contesto.newPage();

  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}?lang=en`);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  // Il cookie lo scrive il selettore quando lo si clicca, non il parametro:
  // quindi si clicca, e poi si va altrove senza parametro.
  await page.getByRole("link", { name: "English" }).first().click();
  await page.goto(`${GUEST_URL}/m/${venue.slug}`);

  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await contesto.close();
});

test("il menu pubblico in una lingua che il locale non ha tradotto tiene i piatti in italiano e l'interfaccia in inglese", async ({
  browser,
}) => {
  // Un tedesco chiede il tedesco su un locale che non ha tradotto niente:
  // deve avere l'interfaccia in inglese, che è il meglio che possiamo dargli,
  // e i piatti in italiano, che è quello che il ristoratore ha scritto.
  const contesto = await browser.newContext({ locale: "de-DE" });
  const page = await contesto.newPage();

  await page.goto(`${GUEST_URL}/m/${venue.slug}?lang=de`);

  // Il guscio della pagina e non <html>: il tedesco non è una lingua
  // dell'interfaccia, quindi il proxy lo passa, `linguaUIPerContenuto` lo
  // porta all'inglese, e l'attributo giusto è quello più vicino al testo.
  await expect(page.locator(".menu-shell")).toHaveAttribute("lang", "en");
  await expect(page.getByText(venue.menuItemName).first()).toBeVisible({
    timeout: 20_000,
  });

  await contesto.close();
});

test("il selettore di lingua c'è anche su un locale che non ha tradotto il menu", async ({
  page,
}) => {
  // Prima si nascondeva quando non c'erano traduzioni del contenuto: ma
  // l'interfaccia è traducibile comunque, e senza selettore il turista non
  // aveva modo di chiederla.
  await page.goto(`${GUEST_URL}/m/${venue.slug}`);

  await expect(page.getByRole("link", { name: "English" }).first()).toBeVisible({
    timeout: 20_000,
  });
});

test("chi prenota in inglese resta inglese sulla riga, così il promemoria del giorno dopo lo trova", async ({
  browser,
}) => {
  const contesto = await browser.newContext({ locale: "en-GB" });
  const page = await contesto.newPage();

  await page.goto(`${GUEST_URL}/p/${venue.slug}`);

  const nome = `E2E Lingua ${Math.random().toString(36).slice(2, 8)}`;
  await page.locator('input[name="name"]').fill(nome);
  await page.locator('input[name="email"]').fill("e2e-lingua@test.local");

  // Domani a cena: dentro la finestra di prenotazione di qualunque locale.
  // Il campo è un `datetime-local`, quindi vuole "AAAA-MM-GGTHH:MM".
  const domani = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const quando = `${domani.toISOString().slice(0, 10)}T20:00`;
  await page.locator('input[name="partySize"]').fill("2");
  await page.locator('input[name="reservedAt"]').fill(quando);

  await page.getByRole("button", { name: /Book|Request|Send|Prenota/i }).click();

  const sql = db();
  try {
    // La lingua deve stare sulla riga: il cron che manda il promemoria non ha
    // né header né cookie da cui dedurla.
    await expect
      .poll(
        async () => {
          const [r] = await sql<{ lingua: string }[]>`
            select lingua from reservations
             where venue_id = ${venue.venueId} and customer_name = ${nome}`;
          return r?.lingua ?? null;
        },
        { timeout: 30_000 }
      )
      .toBe("en");
  } finally {
    await sql.end();
  }

  await contesto.close();
});

test("il gestionale segue la lingua salvata sull'utente, non quella del browser", async ({
  browser,
}) => {
  const sql = db();
  try {
    await sql`update users set lingua_ui = 'en' where id = ${venue.userId}`;
  } finally {
    await sql.end();
  }

  // Browser italiano, preferenza inglese: deve vincere la preferenza, perché
  // è una scelta e non una deduzione.
  const contesto = await browser.newContext({ locale: "it-IT" });
  const page = await contesto.newPage();

  await page.goto(`${DASHBOARD_URL}/login`);
  await page.locator('input[type="email"]').fill(venue.email);
  await page.locator('input[type="password"]').fill(venue.password);
  await page.getByRole("button", { name: /Accedi|Sign in|Log in/i }).click();

  await page.getByRole("button", { name: /^(Esci|Sign out|Log out)$/i }).waitFor({
    state: "visible",
    timeout: 20_000,
  });

  await expect(page.getByRole("button", { name: /^(Sign out|Log out)$/i })).toBeVisible();

  await contesto.close();
});
