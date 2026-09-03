import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

/**
 * Il giro dell'assistenza e le guardie del pannello di piattaforma.
 *
 * Sono le due superfici scritte per ultime e le uniche senza copertura: il
 * pannello vede i dati di tutti i clienti, quindi un controllo che smette di
 * applicarsi non dà errore — mostra semplicemente a un ristoratore il
 * fatturato dei suoi concorrenti.
 *
 * Il ticket è anche l'unico percorso che attraversa i due lati: il locale
 * scrive nel proprio gestionale e la risposta deve tornare lì, non altrove.
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

async function entra(page: import("@playwright/test").Page, v: TestVenue) {
  await page.goto(`${DASHBOARD_URL}/login`);
  await page.locator('input[type="email"]').fill(v.email);
  await page.locator('input[type="password"]').fill(v.password);
  await page.getByRole("button", { name: /Accedi/i }).click();
  // Non si aspetta l'URL: l'host contiene già la parola "dashboard".
  await page.getByRole("button", { name: /^Esci$/i }).waitFor({ state: "visible" });
}

/* ------------------------------------------------------------------ */
/* Guardie del pannello                                                */
/* ------------------------------------------------------------------ */

test("un titolare qualunque non entra nel pannello di piattaforma", async ({ page }) => {
  await entra(page, venue);
  await page.goto(`${DASHBOARD_URL}/admin`);

  // Non deve vedere né l'elenco dei clienti né i loro dati.
  await expect(page.getByText(/Clienti|Locali attivi|Scheda cliente/i)).toHaveCount(0);
  expect(page.url()).not.toContain("/admin");
});

test("il pannello non è raggiungibile senza aver fatto accesso", async ({ page }) => {
  await page.goto(`${DASHBOARD_URL}/admin`);
  await expect(page).toHaveURL(/\/login/);
});

/* ------------------------------------------------------------------ */
/* Assistenza: andata e ritorno                                        */
/* ------------------------------------------------------------------ */

test("la richiesta del locale arriva alla piattaforma e la risposta torna indietro", async ({
  page,
}) => {
  const oggetto = `Prova ${Date.now()}`;

  await entra(page, venue);
  await page.goto(`${DASHBOARD_URL}/dashboard/assistenza`);

  await page.getByLabel(/Di cosa si tratta/i).fill(oggetto);
  await page
    .getByLabel(/Raccontaci cosa succede/i)
    .fill("Il tavolo 3 non apre il menu.");
  await page.getByRole("button", { name: /Invia richiesta/i }).click();

  const sql = db();
  try {
    const leggi = () => sql<{ id: string; venue_id: string; urgenza: string }[]>`
      select id, venue_id, urgenza from support_tickets where oggetto = ${oggetto}`;

    // Arrivata dall'altra parte, con il locale giusto attaccato.
    await expect.poll(async () => (await leggi()).length, { timeout: 20_000 }).toBe(1);
    const [t] = await leggi();

    expect(t.venue_id).toBe(venue.venueId);
    // Casella non spuntata: normale, non vuoto e non "on".
    expect(t.urgenza).toBe("normale");

    // La piattaforma risponde. La risposta deve comparire al locale che ha
    // scritto, sulla sua pagina, senza che nessuno gli mandi una mail.
    await sql`
      update support_tickets
         set risposta = 'Rigenera il QR dalla pagina Tavoli.',
             stato = 'risolto', gestito_da_label = 'Assistenza',
             risolto_at = now()
       where id = ${t.id}`;

    await page.goto(`${DASHBOARD_URL}/dashboard/assistenza`);
    await expect(page.getByText(/Rigenera il QR dalla pagina Tavoli/)).toBeVisible();
  } finally {
    await sql.end();
  }
});

test("dopo una risposta il locale può riscrivere sullo stesso oggetto", async ({ page }) => {
  const oggetto = `Ancora ${Date.now()}`;
  const sql = db();

  try {
    // Una richiesta già risposta ma non chiusa: è il caso in cui la risposta
    // non ha risolto e il locale deve poter dire che il problema resta.
    await sql`
      insert into support_tickets
        (venue_id, aperto_da_label, oggetto, messaggio, stato, risposta)
      values (${venue.venueId}, 'Titolare', ${oggetto}, 'Primo messaggio',
              'in_corso', 'Prova a riavviare')`;

    await entra(page, venue);
    await page.goto(`${DASHBOARD_URL}/dashboard/assistenza`);
    await page.getByLabel(/Di cosa si tratta/i).fill(oggetto);
    await page
      .getByLabel(/Raccontaci cosa succede/i)
      .fill("Riavviato, non cambia nulla.");
    await page.getByRole("button", { name: /Invia richiesta/i }).click();

    await expect
      .poll(
        async () => {
          const r = await sql<{ n: string }[]>`
            select count(*)::text as n from support_tickets
             where venue_id = ${venue.venueId} and oggetto = ${oggetto}`;
          return Number(r[0].n);
        },
        { timeout: 20_000 }
      )
      .toBe(2);
  } finally {
    await sql.end();
  }
});
