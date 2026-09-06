import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

/**
 * «In quanti siete?», dal tavolo alla sala.
 *
 * Il giro è di tre passi e ognuno può rompersi da solo: il tavolo dichiara,
 * la sala accetta, il pagamento si sblocca. Quello che va difeso è che la
 * dichiarazione del tavolo NON sblocchi il pagamento da sola — è una
 * proposta, e a prezzo fisso un tavolo da sei che ne dichiara quattro
 * risparmia cinquantadue euro.
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

/** Un locale a prezzo fisso, con un tavolo aperto dal QR. */
async function tavoloAFormula() {
  const sql = db();
  try {
    await sql`
      update venues
         set formula_attiva = true, formula_predefinita = true,
             formula_pranzo_cents = 2600, formula_cena_cents = 2600,
             formula_ora_cena = '00:00'
       where id = ${venue.venueId}`;

    const code = "T" + Math.random().toString(36).slice(2, 7);
    const [tavolo] = await sql<{ id: string; qr_token: string }[]>`
      insert into tables (venue_id, code, seats)
      values (${venue.venueId}, ${code}, 6) returning id, qr_token`;
    const [s] = await sql<{ id: string }[]>`
      insert into table_sessions (table_id, venue_id, status, formula)
      values (${tavolo.id}, ${venue.venueId}, 'open', true) returning id`;
    return { sessionId: s.id, tableCode: code, qrToken: tavolo.qr_token };
  } finally {
    await sql.end();
  }
}

async function statoSessione(sessionId: string) {
  const sql = db();
  try {
    const [r] = await sql<
      { guest_count: number; coperti_dal_tavolo: boolean; coperti_confermati: boolean }[]
    >`select guest_count, coperti_dal_tavolo, coperti_confermati
        from table_sessions where id = ${sessionId}`;
    return r;
  } finally {
    await sql.end();
  }
}

test("il tavolo dichiara i coperti dal QR, e resta una proposta", async ({ page }) => {
  const t = await tavoloAFormula();

  /*
   * Un piatto ordinato, perché il conto a formula parte da lì.
   *
   * Il prezzo fisso si deve solo da quando il tavolo ha ordinato: prima è un
   * QR inquadrato, e un QR non deve venticinque euro. Qui serve un ordine
   * per arrivare a vedere il totale provvisorio, che è quello che il test
   * verifica.
   */
  const sqlOrdine = db();
  try {
    const [piatto] = await sqlOrdine<{ id: string; price_cents: number }[]>`
      select id, price_cents from menu_items
       where venue_id = ${venue.venueId} and name = ${venue.menuItemName}`;
    const [o] = await sqlOrdine<{ id: string }[]>`
      insert into orders (venue_id, table_session_id, status)
      values (${venue.venueId}, ${t.sessionId}, 'confirmed') returning id`;
    await sqlOrdine`
      insert into order_items (order_id, menu_item_id, quantity, unit_price_cents, status)
      values (${o.id}, ${piatto.id}, 1, ${piatto.price_cents}, 'sent_to_kitchen')`;
  } finally {
    await sqlOrdine.end();
  }

  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${t.qrToken}`);

  // La domanda sta in pagina, non in una finestra sopra: al tavolo un
  // pop-up è la cosa che si chiude per arrivare al menu.
  await expect(
    page.getByRole("heading", { name: /In quanti siete/i })
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "6", exact: true }).first().click();

  await expect
    .poll(async () => (await statoSessione(t.sessionId)).guest_count, { timeout: 20_000 })
    .toBe(6);

  const dopo = await statoSessione(t.sessionId);
  expect(dopo.coperti_dal_tavolo).toBe(true);
  // Il cuore del test: dire non è confermare.
  expect(dopo.coperti_confermati).toBe(false);

  // E a schermo lo dice: il totale c'è ma è provvisorio.
  await expect(page.getByText(/provvisorio/i).first()).toBeVisible({ timeout: 20_000 });
});

test("chi non ha dichiarato niente non vede un totale", async ({ page }) => {
  const t = await tavoloAFormula();

  // Un ordine c'è, ma nessuno ha detto in quanti sono: il conto sarebbe
  // quello di una persona sola, e mostrarlo è peggio che non mostrarlo.
  const sql = db();
  try {
    const [piatto] = await sql<{ id: string; price_cents: number }[]>`
      select id, price_cents from menu_items
       where venue_id = ${venue.venueId} and name = ${venue.menuItemName}`;
    const [o] = await sql<{ id: string }[]>`
      insert into orders (venue_id, table_session_id, status)
      values (${venue.venueId}, ${t.sessionId}, 'confirmed') returning id`;
    await sql`
      insert into order_items (order_id, menu_item_id, quantity, unit_price_cents, status)
      values (${o.id}, ${piatto.id}, 1, ${piatto.price_cents}, 'sent_to_kitchen')`;
  } finally {
    await sql.end();
  }

  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${t.qrToken}#conto`);
  await expect(page.getByText(/conferma il personale/i).first()).toBeVisible({
    timeout: 20_000,
  });
});

test("la sala accetta con un tocco, e solo allora il conto è confermato", async ({
  page,
}) => {
  const t = await tavoloAFormula();

  // Il tavolo ha già risposto dal QR.
  const sql = db();
  try {
    await sql`
      update table_sessions
         set guest_count = 6, coperti_dal_tavolo = true
       where id = ${t.sessionId}`;
    const [piatto] = await sql<{ id: string; price_cents: number }[]>`
      select id, price_cents from menu_items
       where venue_id = ${venue.venueId} and name = ${venue.menuItemName}`;
    const [o] = await sql<{ id: string }[]>`
      insert into orders (venue_id, table_session_id, status)
      values (${venue.venueId}, ${t.sessionId}, 'confirmed') returning id`;
    await sql`
      insert into order_items (order_id, menu_item_id, quantity, unit_price_cents, status)
      values (${o.id}, ${piatto.id}, 1, ${piatto.price_cents}, 'sent_to_kitchen')`;
  } finally {
    await sql.end();
  }

  await page.goto(`${DASHBOARD_URL}/login`);
  await page.locator('input[type="email"]').fill(venue.email);
  await page.locator('input[type="password"]').fill(venue.password);
  await page.getByRole("button", { name: /Accedi|Sign in/i }).click();
  await page.getByRole("button", { name: /^(Esci|Sign out)$/i }).waitFor({ timeout: 20_000 });

  await page.goto(`${DASHBOARD_URL}/dashboard`);

  // La sala legge quello che ha detto il tavolo invece di contare le teste.
  await expect(page.getByText(/Il tavolo dice: 6 coperti|The table says: 6 covers/i))
    .toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: /^(Accetta|Accept)$/i }).first().click();

  await expect
    .poll(async () => (await statoSessione(t.sessionId)).coperti_confermati, {
      timeout: 20_000,
    })
    .toBe(true);

  // Il numero non è cambiato: è stato accettato, non riscritto.
  expect((await statoSessione(t.sessionId)).guest_count).toBe(6);
});

test("la dichiarazione del tavolo non scavalca la conferma già data", async () => {
  const t = await tavoloAFormula();

  const sql = db();
  try {
    // La sala ha già confermato sei.
    await sql`
      update table_sessions
         set guest_count = 6, coperti_confermati = true
       where id = ${t.sessionId}`;
  } finally {
    await sql.end();
  }

  // Chi conosce l'id della sessione prova a riabbassare a uno. Deve
  // rimbalzare: la conferma resterebbe valida, e quel conto si potrebbe
  // anche pagare.
  const res = await fetch(`${GUEST_URL}/api/coperti`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: t.sessionId, coperti: 1 }),
  });

  expect(res.status).toBe(409);
  expect((await statoSessione(t.sessionId)).guest_count).toBe(6);
});

test("un tavolo alla carta non si fa chiedere i coperti", async ({ page }) => {
  const t = await tavoloAFormula();

  const sql = db();
  try {
    await sql`update table_sessions set formula = false where id = ${t.sessionId}`;
  } finally {
    await sql.end();
  }

  await page.goto(`${GUEST_URL}/v/${venue.slug}/t/${t.qrToken}`);
  // Il menu c'è, la domanda no: alla carta i coperti muovono il coperto, e
  // due euro non valgono una domanda a chi si è appena seduto.
  await expect(page.getByText(venue.menuItemName).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /In quanti siete/i })).toHaveCount(0);
});
