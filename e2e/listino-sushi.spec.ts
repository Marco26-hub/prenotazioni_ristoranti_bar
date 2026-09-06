import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

/**
 * Il listino di partenza del sushi, applicato davvero.
 *
 * Un listino regalato che nasce sbagliato è peggio di nessun listino: il
 * ristoratore si fida e non ricontrolla. Qui si difendono le tre cose che,
 * sbagliate, costano soldi o una sanzione — il crudo dichiarato abbattuto,
 * l'alcol al 22%, e le bevande fuori dal prezzo fisso.
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

async function applicaSushi(page: import("@playwright/test").Page) {
  await page.goto(`${DASHBOARD_URL}/login`);
  await page.locator('input[type="email"]').fill(venue.email);
  await page.locator('input[type="password"]').fill(venue.password);
  await page.getByRole("button", { name: /Accedi|Sign in/i }).click();
  await page.getByRole("button", { name: /^(Esci|Sign out)$/i }).waitFor({ timeout: 20_000 });

  await page.goto(`${DASHBOARD_URL}/dashboard/menu`);
  const scelta = page.getByRole("button", { name: /Sushi/i }).first();
  await scelta.waitFor({ state: "visible", timeout: 20_000 });
  await scelta.click();

  /*
   * La casella del listino compare SOLO se il modello ne ha uno. Prima del
   * 6 settembre 2026 il sushi era l'unico grande formato senza, quindi
   * questa riga è essa stessa metà del collaudo: se il listino sparisse,
   * il test fallirebbe qui invece che con un elenco vuoto più sotto.
   */
  const conListino = page.locator('input[name="conListino"]');
  await conListino.waitFor({ state: "visible", timeout: 20_000 });
  await conListino.check();

  await page.getByRole("button", { name: /^Applica il modello/i }).click();
  await expect(page.getByText(/Formato impostato/i)).toBeVisible({
    timeout: 30_000,
  });
}

test("il listino sushi dichiara abbattuto tutto il pesce servito crudo", async ({
  page,
}) => {
  await applicaSushi(page);

  const sql = db();
  try {
    const crudo = await sql<{ name: string; conservation: string }[]>`
      select mi.name, mi.conservation
        from menu_items mi
        join menu_categories c on c.id = mi.category_id
       where mi.venue_id = ${venue.venueId}
         and c.name in ('Nigiri', 'Sashimi', 'Uramaki', 'Hosomaki', 'Temaki')
       order by mi.name`;

    expect(crudo.length).toBeGreaterThan(8);

    /*
     * Non tutto il crudo è crudo: il gambero del nigiri è lessato e il
     * surimi della California è cotto. Quelli restano freschi, ed è la
     * differenza che il Reg. CE 853/2004 fa. Qui si difende il contrario:
     * che nessuna voce di pesce crudo sia rimasta "fresco".
     */
    const nonDichiarati = crudo.filter(
      (r) =>
        /salmone|tonno|sashimi|spicy tuna/i.test(r.name) &&
        r.conservation !== "abbattuto"
    );
    expect(nonDichiarati.map((r) => r.name)).toEqual([]);
  } finally {
    await sql.end();
  }
});

test("birre e sake nascono al 22%, non all'aliquota della cucina", async ({ page }) => {
  await applicaSushi(page);

  const sql = db();
  try {
    const alcol = await sql<{ name: string; vat_rate: number; kind: string }[]>`
      select mi.name, mi.vat_rate, mi.kind
        from menu_items mi
        join menu_categories c on c.id = mi.category_id
       where mi.venue_id = ${venue.venueId}
         and c.name in ('Birre', 'Sake e vini')`;

    expect(alcol.length).toBeGreaterThan(0);
    // 10% è l'aliquota della somministrazione: sull'alcol è un errore che
    // si scopre col commercialista, mesi dopo.
    expect(alcol.filter((r) => Number(r.vat_rate) !== 22)).toEqual([]);
  } finally {
    await sql.end();
  }
});

test("bevande e dolci del listino restano a pagamento dentro il prezzo fisso", async ({
  page,
}) => {
  await applicaSushi(page);

  const sql = db();
  try {
    const fuori = await sql<{ name: string; fuori_formula: boolean }[]>`
      select mi.name, mi.fuori_formula
        from menu_items mi
        join menu_categories c on c.id = mi.category_id
       where mi.venue_id = ${venue.venueId}
         and c.name in ('Dolci', 'Bevande', 'Birre', 'Sake e vini')`;

    expect(fuori.length).toBeGreaterThan(0);
    // Se nascono dentro la formula, il cliente le vede comprese e a fine
    // serata non sono nel conto: ogni bevanda venduta, persa.
    expect(fuori.filter((r) => !r.fuori_formula).map((r) => r.name)).toEqual([]);
  } finally {
    await sql.end();
  }
});

test("il crudo va al banco sushi, i fritti alla cucina", async ({ page }) => {
  await applicaSushi(page);

  const sql = db();
  try {
    const rep = await sql<{ name: string; reparto: string }[]>`
      select name, reparto from menu_categories
       where venue_id = ${venue.venueId}
         and name in ('Nigiri', 'Sashimi', 'Fritti', 'Birre')`;
    const per = Object.fromEntries(rep.map((r) => [r.name, r.reparto]));

    expect(per["Nigiri"]).toBe("sushi");
    expect(per["Sashimi"]).toBe("sushi");
    // I fritti li fa la cucina: mandandoli al banco crudo, le due postazioni
    // si vedono le comande a vicenda.
    expect(per["Fritti"]).toBe("cucina");
    expect(per["Birre"]).toBe("bar");
  } finally {
    await sql.end();
  }
});
