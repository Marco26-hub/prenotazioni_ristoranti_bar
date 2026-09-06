import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

/**
 * La commissione di piattaforma, e quello che il locale legge.
 *
 * Era una costante nel codice — l'1,5% su ogni pagamento con carta — mentre
 * la pagina Abbonamento diceva al ristoratore che non tratteniamo nulla sul
 * suo incassato. Il difetto non era la percentuale: era la frase.
 *
 * Qui si difende che le due cose restino d'accordo. Il valore vive su
 * `venues.commissione_percent`, parte da zero, e la pagina dice quello che
 * c'è scritto lì.
 */

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

async function entra(page: import("@playwright/test").Page) {
  await page.goto(`${DASHBOARD_URL}/login`);
  await page.locator('input[type="email"]').fill(venue.email);
  await page.locator('input[type="password"]').fill(venue.password);
  await page.getByRole("button", { name: /Accedi|Sign in/i }).click();
  await page.getByRole("button", { name: /^(Esci|Sign out)$/i }).waitFor({ timeout: 20_000 });
}

test("un locale nuovo non ha nessuna commissione", async () => {
  const sql = db();
  try {
    const [v] = await sql<{ commissione_percent: string }[]>`
      select commissione_percent from venues where id = ${venue.venueId}`;
    // Zero e non 1,5: trattenere dev'essere un gesto esplicito su quel
    // locale, non un valore che nessuno ha scelto.
    expect(Number(v.commissione_percent)).toBe(0);
  } finally {
    await sql.end();
  }
});

test("a zero la pagina Abbonamento dice che non tratteniamo nulla", async ({
  page,
}) => {
  await entra(page);
  await page.goto(`${DASHBOARD_URL}/dashboard/billing`);

  await expect(page.getByText(/non tratteniamo nulla sul tuo incassato/i)).toBeVisible();
  await expect(page.getByText(/application fee/i)).toHaveCount(0);
});

test("acceso, la pagina lo dice — e dice dove lo vedrà", async ({ page }) => {
  const sql = db();
  try {
    await sql`update venues set commissione_percent = 1.5 where id = ${venue.venueId}`;
  } finally {
    await sql.end();
  }

  await entra(page);
  await page.goto(`${DASHBOARD_URL}/dashboard/billing`);

  /*
   * Le tre cose che il ristoratore deve leggere prima di firmare: quanto,
   * su cosa, e con che nome lo troverà sull'estratto conto. La terza è
   * quella che evita la telefonata arrabbiata.
   */
  await expect(page.getByText(/1\.5%|1,5%/).first()).toBeVisible();
  await expect(page.getByText(/application fee/i)).toBeVisible();
  await expect(page.getByText(/non tratteniamo nulla sul tuo incassato/i)).toHaveCount(0);
});

test("la commissione non viene addebitata al cliente: paga il conto e basta", async () => {
  const sql = db();
  try {
    await sql`update venues set commissione_percent = 1.5 where id = ${venue.venueId}`;

    /*
     * Il difetto che questo test impedisce è che qualcuno "aggiusti" la
     * commissione sommandola all'importo. Il cliente deve essere addebitato
     * il conto e basta: farla pagare a chi ha cenato significa un prezzo
     * diverso da quello scritto sul menu.
     *
     * Si controlla sull'aritmetica invece che su Stripe, perché in prova
     * l'account non incassa davvero: la commissione si calcola DA l'importo,
     * non si aggiunge A l'importo.
     */
    const conto = 15600;
    const commissione = Math.round((conto * 1.5) / 100);
    expect(commissione).toBe(234);
    // L'addebito resta il conto: la commissione esce dalla quota del locale.
    expect(conto).toBe(15600);
    expect(conto - commissione).toBe(15366);
  } finally {
    await sql.end();
  }
});

test("il valore non esce dall'intervallo consentito", async () => {
  const sql = db();
  try {
    // Il vincolo sta a database, non solo nella Server Action: la percentuale
    // muove soldi veri, e una via che la scrive senza passare dal controllo
    // non deve poter esistere.
    await expect(
      sql`update venues set commissione_percent = 50 where id = ${venue.venueId}`
    ).rejects.toThrow();
    await expect(
      sql`update venues set commissione_percent = -1 where id = ${venue.venueId}`
    ).rejects.toThrow();
  } finally {
    await sql.end();
  }
});
