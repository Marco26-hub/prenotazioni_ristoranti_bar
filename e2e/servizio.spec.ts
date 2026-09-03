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

  // Con un importo ancora aperto il bottone dichiara che sta registrando un
  // incasso, non solo chiudendo il tavolo: è la stessa azione, detta meglio.
  const chiudi = page.getByRole("button", { name: /Incassa e chiudi|Chiudi conto/ });
  await expect(chiudi.first()).toBeVisible({ timeout: 15000 });
  await chiudi.first().click();

  // Il tavolo torna libero e il bottone sparisce.
  await expect(page.getByText("libero").first()).toBeVisible({ timeout: 15000 });
  await expect(chiudi).toHaveCount(0);

  // L'incasso deve comunque risultare nello storico di giornata.
  await page.goto(`${DASHBOARD_URL}/dashboard/orders/storico`);
  await expect(page.getByText("Incassato")).toBeVisible();
});

test("con una carta in corso l'incasso al banco viene rifiutato", async ({
  page,
  context,
}) => {
  const guest = await context.newPage();
  await guest.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);
  await guest.getByRole("button", { name: /^Aggiungi / }).first().click();
  await guest.getByRole("button", { name: "Ordina" }).click();
  await expect(guest.getByText("Ordine inviato in cucina.")).toBeVisible();
  await guest.close();

  const sql = (await import("postgres")).default(process.env.DATABASE_URL!, {
    ssl: "require",
    prepare: false,
  });

  try {
    // Il cliente ha aperto il pagamento con carta ed è fermo
    // sull'autorizzazione. Intanto dice al cameriere "faccio in contanti".
    const [s] = await sql<{ id: string }[]>`
      select ts.id from table_sessions ts
       where ts.venue_id = ${venue.venueId} and ts.status = 'open'
       order by ts.opened_at desc limit 1`;

    await sql`
      insert into payments (venue_id, table_session_id, amount_cents, method,
                            provider, provider_payment_id, split_type, status)
      values (${venue.venueId}, ${s.id}, 1000, 'card', 'stripe',
              ${"pi_test_" + Date.now()}, 'full', 'pending')`;

    await login(page);
    const chiudi = page.getByRole("button", { name: /Incassa e chiudi|Chiudi conto/ });
    await expect(chiudi.first()).toBeVisible({ timeout: 15000 });
    await chiudi.first().click();

    // Rifiutato, e detto: incassare adesso farebbe pagare due volte.
    await expect(page.getByText(/pagamento con carta in corso/i)).toBeVisible({
      timeout: 15000,
    });

    // E il conto è rimasto aperto davvero, non solo a schermo.
    const [dopo] = await sql<{ status: string }[]>`
      select status from table_sessions where id = ${s.id}`;
    expect(dopo.status).toBe("open");

    // Nessun incasso in contanti registrato.
    const [contanti] = await sql<{ n: string }[]>`
      select count(*)::text as n from payments
       where table_session_id = ${s.id} and method = 'cash'`;
    expect(Number(contanti.n)).toBe(0);
  } finally {
    await sql.end();
  }
});

test("con l'intervallo attivo il secondo ordine viene respinto", async ({ context }) => {
  const sql = (await import("postgres")).default(process.env.DATABASE_URL!, {
    ssl: "require",
    prepare: false,
  });

  try {
    // Formula a prezzo fisso: si ordina a ondate, non tutto in una volta.
    await sql`
      update venues set ordine_intervallo_min = 5 where id = ${venue.venueId}`;

    const guest = await context.newPage();
    await guest.goto(`${GUEST_URL}/v/${venue.slug}/t/${venue.qrToken}`);
    await guest.getByRole("button", { name: /^Aggiungi / }).first().click();
    await guest.getByRole("button", { name: "Ordina" }).click();
    await expect(guest.getByText("Ordine inviato in cucina.")).toBeVisible({
      timeout: 20_000,
    });

    // Subito dopo, il secondo ordine non deve passare. Il controllo che conta
    // è quello del server: il bottone si può aggirare, l'endpoint no.
    const esito = await guest.evaluate(async () => {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "", items: [] }),
      });
      return r.status;
    });
    // Corpo vuoto: 400. Serve solo a provare che l'endpoint risponde.
    expect(esito).toBe(400);

    const [sessione] = await sql<{ id: string }[]>`
      select ts.id from table_sessions ts
        join tables t on t.id = ts.table_id
       where t.qr_token = ${venue.qrToken} and ts.status = 'open'
       order by ts.opened_at desc limit 1`;

    const [piatto] = await sql<{ id: string }[]>`
      select id from menu_items where venue_id = ${venue.venueId} limit 1`;

    const risposta = await guest.evaluate(
      async ([sessionId, menuItemId]) => {
        const r = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            items: [{ menuItemId, quantity: 1 }],
          }),
        });
        return { stato: r.status, corpo: await r.json() };
      },
      [sessione.id, piatto.id]
    );

    expect(risposta.stato).toBe(429);
    expect(risposta.corpo.attesaSecondi).toBeGreaterThan(0);

    // Nessuna seconda comanda scritta.
    const [n] = await sql<{ n: string }[]>`
      select count(*)::text as n from orders
       where table_session_id = ${sessione.id} and status <> 'cancelled'`;
    expect(Number(n.n)).toBe(1);

    await guest.close();
  } finally {
    await sql`update venues set ordine_intervallo_min = 0 where id = ${venue.venueId}`;
    await sql.end();
  }
});
