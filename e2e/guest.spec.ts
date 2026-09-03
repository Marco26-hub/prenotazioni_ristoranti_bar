import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

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

test("il tavolo mostra il menu del locale", async ({ page }) => {
  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);

  await expect(page.getByRole("heading", { name: "E2E Test Venue" })).toBeVisible();
  await expect(page.getByText("Tavolo", { exact: true })).toBeVisible();
  await expect(page.getByText("T1", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Paga ora" })).toHaveAttribute("href", "#conto");
  await expect(page.getByText(venue.menuItemName)).toBeVisible();
  await expect(page.getByText("15,00 €").first()).toBeVisible();
});

test("il menu pubblico apre i dettagli e non contiene la prenotazione", async ({ page }) => {
  await page.goto(`${GUEST_URL}/m/${venue.slug}`);

  await expect(page.getByRole("heading", { name: "E2E Test Venue" })).toBeVisible();
  await expect(page.getByRole("link", { name: /prenota/i })).toHaveCount(0);

  await page.getByRole("button", { name: "Dolci", exact: true }).click();
  await expect(page.getByText("Dolce Test")).toBeVisible();
  await expect(page.getByText(venue.menuItemName)).toHaveCount(0);
  await page.getByRole("button", { name: "Tutti", exact: true }).click();
  await expect(page.getByText(venue.menuItemName)).toBeVisible();

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

test("una prenotazione occupa automaticamente un tavolo compatibile", async ({ page }) => {
  const data = new Date(Date.now() + 48 * 60 * 60 * 1000);
  data.setHours(20, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const quando = `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T20:00`;
  const nome = `Prenotazione E2E ${Date.now()}`;

  await page.goto(`${GUEST_URL}/p/${venue.slug}`);
  await page.getByLabel("Nome e cognome").fill(nome);
  await page.getByLabel("Quante persone").fill("2");
  await page.getByLabel("Giorno e ora").fill(quando);
  await page.getByLabel("Telefono").fill("+393331234567");
  await page.getByRole("button", { name: "Prenota il tavolo" }).click();
  // Più dei 5 secondi di default: la richiesta apre una transazione e prova
  // ad avvisare il locale per email prima di rispondere, e su una funzione
  // appena avviata non ci sta.
  await expect(page.getByText(/Prenotazione ricevuta/)).toBeVisible({
    timeout: 20_000,
  });

  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", prepare: false });
  try {
    const [assegnazione] = await sql<{ code: string; seats: number }[]>`
      select t.code, t.seats
        from reservations r
        join reservation_tables rt on rt.reservation_id = r.id
        join tables t on t.id = rt.table_id
       where r.venue_id = ${venue.venueId} and r.customer_name = ${nome}`;
    expect(assegnazione).toMatchObject({ code: "T1", seats: 4 });
  } finally {
    await sql.end();
  }
});

test("un qr_token inesistente non apre nessun tavolo", async ({ page }) => {
  const res = await page.goto(`${GUEST_URL}/v/${venue.slug}/t/token-inventato`);
  expect(res?.status()).toBe(404);
});

test("lo stesso piatto con due varianti non viene rifiutato", async ({ page, request }) => {
  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);

  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", prepare: false });
  try {
    const [session] = await sql<{ id: string }[]>`
      select id from table_sessions
       where venue_id = ${venue.venueId} and status = 'open'
       order by opened_at desc limit 1`;
    const [item] = await sql<{ id: string }[]>`
      select id from menu_items
       where venue_id = ${venue.venueId} and name = ${venue.menuItemName}`;

    const response = await request.post(`${GUEST_URL}/api/orders`, {
      data: {
        sessionId: session.id,
        items: [
          { menuItemId: item.id, quantity: 1, optionIds: [] },
          { menuItemId: item.id, quantity: 1, optionIds: [] },
        ],
      },
    });
    expect(response.status()).toBe(201);
  } finally {
    await sql.end();
  }
});

test("ordine: aggiungi al carrello, invia, il conto si aggiorna", async ({ page }) => {
  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);

  // Il carrello compare solo dopo aver aggiunto qualcosa.
  await expect(page.getByRole("button", { name: "Ordina" })).toHaveCount(0);

  await page.getByRole("button", { name: /^Aggiungi / }).first().click();
  await page.getByRole("button", { name: /^Aggiungi / }).first().click();

  await expect(page.getByText("articoli")).toBeVisible();
  // Il riepilogo mostra lo stesso importo piu volte — unitario, riga e
  // totale — quindi si verifica che ci sia, non che sia unico.
  await expect(page.getByText("30,00 €").first()).toBeVisible();

  await page.getByRole("button", { name: "Ordina" }).click();
  await expect(page.getByText("Ordine inviato in cucina.")).toBeVisible();

  // Il totale del conto riflette l'ordine appena inviato (polling ogni 5s).
  await expect(page.getByText("Il conto")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("30,00 €").first()).toBeVisible();
});

test("senza metodi di pagamento configurati il conto lo dice esplicitamente", async ({ page }) => {
  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);

  // Serve qualcosa da pagare: su un conto a zero non c'è nessun pagamento da
  // proporre, quindi nemmeno da dichiarare non disponibile. Prima il test
  // passava per gli ordini lasciati dai test precedenti sullo stesso locale.
  await page.getByRole("button", { name: /^Aggiungi / }).first().click();
  await page.getByRole("button", { name: "Ordina" }).click();
  await expect(page.getByText("Ordine inviato in cucina.")).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    page.getByText("Il pagamento con carta non è attivo in questo locale")
  ).toBeVisible({ timeout: 15000 });
});

test("le pagine legali sono raggiungibili", async ({ page }) => {
  await page.goto(`${GUEST_URL}/privacy`);
  await expect(page.getByRole("heading", { name: "Informativa privacy" })).toBeVisible();

  await page.goto(`${GUEST_URL}/termini`);
  await expect(page.getByRole("heading", { name: "Termini di servizio" })).toBeVisible();
});
