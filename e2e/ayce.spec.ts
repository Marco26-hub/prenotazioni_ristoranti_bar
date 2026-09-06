import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, statoRiga, type TestVenue } from "./fixtures";

/**
 * Il caso all you can eat, dove le cose si rompono per accumulo.
 *
 * Un sushi a prezzo fisso non assomiglia a una trattoria: ottanta piatti a
 * tavolo, due reparti che lavorano lo stesso tavolo nello stesso momento —
 * il banco crudo e la cucina dei fritti — e nessuno che tocchi "servito"
 * ottanta volte. Sono le tre condizioni che hanno fatto emergere questi due
 * difetti, e nessuna delle tre si presenta in un locale da venti coperti.
 */

const DASHBOARD_URL = process.env.E2E_DASHBOARD_URL ?? "http://localhost:3011";
const CHIAVE_REPARTO = "comande.reparto";

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

/**
 * Un tavolo con due piatti di due reparti diversi, come una comanda vera di
 * un all you can eat: il crudo al banco, il fritto in cucina.
 */
async function tavoloConDueReparti(stato = "preparing") {
  const sql = db();
  try {
    const code = "T" + Math.random().toString(36).slice(2, 7);

    const [tavolo] = await sql<{ id: string }[]>`
      insert into tables (venue_id, code, seats)
      values (${venue.venueId}, ${code}, 4) returning id`;

    const cat = async (nome: string, reparto: string) => {
      const [c] = await sql<{ id: string }[]>`
        insert into menu_categories (venue_id, name, sort_order, reparto)
        values (${venue.venueId}, ${nome}, 1, ${reparto}) returning id`;
      return c.id;
    };
    const piatto = async (categoriaId: string, nome: string) => {
      const [p] = await sql<{ id: string }[]>`
        insert into menu_items (venue_id, category_id, name, price_cents, available)
        values (${venue.venueId}, ${categoriaId}, ${nome}, 500, true) returning id`;
      return p.id;
    };

    const nigiri = await piatto(await cat(`Nigiri ${code}`, "sushi"), `Nigiri salmone ${code}`);
    const fritti = await piatto(await cat(`Fritti ${code}`, "cucina"), `Gyoza ${code}`);

    const [sessione] = await sql<{ id: string }[]>`
      insert into table_sessions (table_id, venue_id, status, guest_count)
      values (${tavolo.id}, ${venue.venueId}, 'open', 4) returning id`;
    const [ordine] = await sql<{ id: string }[]>`
      insert into orders (venue_id, table_session_id, status)
      values (${venue.venueId}, ${sessione.id}, 'confirmed') returning id`;

    const riga = async (menuItemId: string) => {
      const [r] = await sql<{ id: string }[]>`
        insert into order_items (order_id, menu_item_id, quantity,
                                 unit_price_cents, status)
        values (${ordine.id}, ${menuItemId}, 1, 500, ${stato}) returning id`;
      return r.id;
    };

    return {
      tableCode: code,
      sessionId: sessione.id,
      rigaSushi: await riga(nigiri),
      rigaCucina: await riga(fritti),
      nomeSushi: `Nigiri salmone ${code}`,
      nomeCucina: `Gyoza ${code}`,
    };
  } finally {
    await sql.end();
  }
}

async function entra(page: import("@playwright/test").Page) {
  await page.goto(`${DASHBOARD_URL}/login`);
  await page.locator('input[type="email"]').fill(venue.email);
  await page.locator('input[type="password"]').fill(venue.password);
  await page.getByRole("button", { name: /Accedi|Sign in|Log in/i }).click();
  // Non aspettare l'URL: l'host contiene "dashboard" e una waitForURL su
  // /dashboard/ passa anche restando sulla pagina di accesso.
  await page.getByRole("button", { name: /^(Esci|Sign out|Log out)$/i }).waitFor({
    state: "visible",
    timeout: 20_000,
  });
}

test("la stampa comande non contiene i tavoli gia chiusi", async ({ page }) => {
  const aperto = await tavoloConDueReparti("sent_to_kitchen");
  const chiuso = await tavoloConDueReparti("sent_to_kitchen");

  // Chiudere il conto chiude la sessione ma NON porta le righe a 'served', e
  // in un all you can eat nessuno le segna a mano: restano a
  // 'sent_to_kitchen' per sempre. Senza il limite alla sessione aperta, la
  // pagina di stampa ristampava le comande di ieri insieme a quelle di
  // stasera — e chi la usa come ripiego quando lo schermo si pianta
  // preparava roba gia' mangiata e pagata.
  const sql = db();
  try {
    await sql`update table_sessions set status = 'closed', closed_at = now()
               where id = ${chiuso.sessionId}`;
  } finally {
    await sql.end();
  }

  await entra(page);
  await page.goto(`${DASHBOARD_URL}/dashboard/orders/stampa`);

  await expect(page.getByText(aperto.nomeSushi)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(chiuso.nomeSushi)).toHaveCount(0);
  await expect(page.getByText(chiuso.nomeCucina)).toHaveCount(0);
});

test("«tutto pronto» dal banco sushi non manda fuori anche i fritti", async ({
  page,
}) => {
  const t = await tavoloConDueReparti("preparing");

  // Lo schermo del banco crudo. Il filtro vive nel dispositivo, non
  // nell'account: due schermi sullo stesso account padrone — il caso normale
  // in un locale a gestione familiare — è esattamente la configurazione in
  // cui il difetto si vedeva.
  await page.addInitScript(
    ([chiave, valore]) => {
      try {
        localStorage.setItem(chiave, valore);
      } catch {
        // Navigazione privata: il test fallirà in modo leggibile più sotto.
      }
    },
    [CHIAVE_REPARTO, "sushi"]
  );

  await entra(page);
  await page.goto(`${DASHBOARD_URL}/dashboard/orders`);

  // Il piatto della cucina non deve nemmeno comparire su questo schermo.
  await expect(page.getByText(t.nomeSushi)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(t.nomeCucina)).toHaveCount(0);

  // Il bottone dichiara quante righe sposta: deve dire 1, non 2.
  const pronto = page.getByRole("button", { name: /(Tutto pronto|All ready)\s*\(1\)/i });
  await pronto.waitFor({ state: "visible", timeout: 20_000 });
  await pronto.click();

  await expect
    .poll(async () => (await statoRiga(t.rigaSushi)).status, { timeout: 20_000 })
    .toBe("ready");

  // Il cuore del test: la riga della cucina non si è mossa. Prima si
  // spostava, e sullo schermo di cucina spariva dalla coda senza che nessuno
  // l'avesse toccata — con il cameriere che andava al passe a ritirare
  // fritti che non esistevano.
  expect((await statoRiga(t.rigaCucina)).status).toBe("preparing");
});

test("trattenere dal banco sushi non trattiene la cucina", async ({ page }) => {
  const t = await tavoloConDueReparti("preparing");

  await page.addInitScript(
    ([chiave, valore]) => {
      try {
        localStorage.setItem(chiave, valore);
      } catch {
        /* vedi sopra */
      }
    },
    [CHIAVE_REPARTO, "sushi"]
  );

  await entra(page);
  await page.goto(`${DASHBOARD_URL}/dashboard/orders`);
  await expect(page.getByText(t.nomeSushi)).toBeVisible({ timeout: 20_000 });

  // Il bottone di tavolo, non quello della singola riga: è il gesto in
  // blocco che aveva il buco.
  const trattieni = page
    .getByRole("button", { name: /(Ritarda il tavolo|Hold the table|Hold table)/i })
    .first();
  await trattieni.waitFor({ state: "visible", timeout: 20_000 });
  await trattieni.click();

  await expect
    .poll(async () => (await statoRiga(t.rigaSushi)).trattenuto, { timeout: 20_000 })
    .toBe(true);

  expect((await statoRiga(t.rigaCucina)).trattenuto).toBe(false);
});
