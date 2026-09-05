import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

/**
 * I modelli di formato, applicati davvero.
 *
 * Un modello non crea solo delle categorie con un nome: decide dove si
 * prepara ogni cosa, con quale aliquota si vende e cosa resta a pagamento
 * dentro una formula a prezzo fisso. Sono i campi che, lasciati vuoti,
 * rompono in silenzio cose costruite altrove — i permessi per reparto, la
 * fattura, il conto dell'all you can eat.
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
  await page.getByRole("button", { name: /Accedi/i }).click();
  await page.getByRole("button", { name: /^Esci$/i }).waitFor({
    state: "visible",
    timeout: 20_000,
  });
}

async function applica(page: import("@playwright/test").Page, formato: RegExp) {
  await page.goto(`${DASHBOARD_URL}/dashboard/menu`);

  // Due passi: prima si sceglie il formato, poi si conferma — perché
  // applicarne uno per sbaglio con un tocco solo sarebbe difficile da
  // disfare.
  const scelta = page.getByRole("button", { name: formato }).first();
  await scelta.waitFor({ state: "visible", timeout: 20_000 });
  await scelta.click();

  await page
    .getByRole("button", { name: /^Applica il modello/i })
    .click();

  await expect(page.getByText(/Formato impostato/i)).toBeVisible({
    timeout: 30_000,
  });
}

test("la gintoneria manda i cocktail al bar, non in cucina", async ({ page }) => {
  const sql = db();

  try {
    await entra(page);
    await applica(page, /Gintoneria/i);

    const categorie = await sql<{ name: string; reparto: string }[]>`
      select name, reparto from menu_categories
       where venue_id = ${venue.venueId} order by name`;

    const perNome = new Map(categorie.map((c) => [c.name, c.reparto]));

    /*
     * È il punto: senza il reparto, i cocktail finiscono sullo schermo della
     * cucina e il barista — che ha il permesso solo sul bar — non può
     * muoverli. Il modello è l'unica occasione in cui il sistema sa dove si
     * prepara ogni cosa senza doverlo chiedere.
     */
    expect(perNome.get("Gin tonic")).toBe("bar");
    expect(perNome.get("Signature")).toBe("bar");
    expect(perNome.get("Distillati lisci")).toBe("bar");

    // Il tagliere invece si prepara in cucina: il reparto dice dove si fa la
    // cosa, non che tipo di locale è.
    expect(perNome.get("Taglieri e sfizi")).toBe("cucina");
  } finally {
    await sql.end();
  }
});

test("gli alcolici nascono al 22%, non all'aliquota della cucina", async ({
  page,
}) => {
  const sql = db();

  try {
    await entra(page);

    // Un piatto già in una categoria che il modello porterà a 22.
    const [c] = await sql<{ id: string }[]>`
      insert into menu_categories (venue_id, name, sort_order)
      values (${venue.venueId}, 'Vini', 50) returning id`;
    const [piatto] = await sql<{ id: string }[]>`
      insert into menu_items (venue_id, category_id, name, price_cents, sort_order)
      values (${venue.venueId}, ${c.id}, 'Rosso della casa', 1800, 0)
      returning id`;

    await applica(page, /^Ristorante/i);

    const [dopo] = await sql<{ vat_rate: string; kind: string }[]>`
      select vat_rate, kind from menu_items where id = ${piatto.id}`;

    // Un vino lasciato al 10% è un errore fiscale che non dà nessun errore.
    expect(Number(dopo.vat_rate)).toBe(22);
    expect(dopo.kind).toBe("wine");
  } finally {
    await sql.end();
  }
});

test("nel sushi dolci e bevande restano a pagamento dentro la formula", async ({
  page,
}) => {
  const sql = db();

  try {
    await entra(page);

    const [c] = await sql<{ id: string }[]>`
      insert into menu_categories (venue_id, name, sort_order)
      values (${venue.venueId}, 'Bevande', 60) returning id`;
    const [bibita] = await sql<{ id: string }[]>`
      insert into menu_items (venue_id, category_id, name, price_cents, sort_order)
      values (${venue.venueId}, ${c.id}, 'Acqua', 200, 0) returning id`;

    await applica(page, /Sushi/i);

    const [dopo] = await sql<{ fuori_formula: boolean }[]>`
      select fuori_formula from menu_items where id = ${bibita.id}`;

    // Un all you can eat che comprende anche le bevande le regala.
    expect(dopo.fuori_formula).toBe(true);
  } finally {
    await sql.end();
  }
});

test("applicare la piadineria accende la consegna al bancone", async ({ page }) => {
  const sql = db();

  try {
    await entra(page);
    await applica(page, /Piadineria/i);

    const [v] = await sql<
      {
        servizio_al_banco: boolean;
        pickup_numbering_enabled: boolean;
        pickup_metodi: string[];
      }[]
    >`select servizio_al_banco, pickup_numbering_enabled, pickup_metodi
        from venues where id = ${venue.venueId}`;

    /*
     * In piadineria la gente si siede dove capita: con il conto condiviso
     * del tavolo, la piadina del secondo cliente finisce sul conto del primo.
     */
    expect(v.servizio_al_banco).toBe(true);
    expect(v.pickup_numbering_enabled).toBe(true);
    // Un numero che nessuno chiama non serve: si parte dall'avviso che non
    // richiede di comprare niente.
    expect(v.pickup_metodi).toContain("telefono");
  } finally {
    await sql.end();
  }
});

test("il listino di esempio nasce spento e con gli allergeni compilati", async ({
  page,
}) => {
  const sql = db();

  try {
    await entra(page);
    await page.goto(`${DASHBOARD_URL}/dashboard/menu`);
    await page.getByRole("button", { name: /^Ristorante/i }).first().click();
    await page.getByLabel(/listino di esempio/i).check();
    await page.getByRole("button", { name: /^Applica il modello/i }).click();
    await expect(page.getByText(/Formato impostato/i)).toBeVisible({
      timeout: 30_000,
    });

    // Solo le voci create dal modello: il locale di prova ne ha già due sue,
    // e quelle sono giustamente disponibili.
    const piatti = await sql<
      { name: string; available: boolean; allergens: string[] | null }[]
    >`select name, available, allergens from menu_items
       where venue_id = ${venue.venueId}
         and name not in (${venue.menuItemName}, 'Dolce Test')`;

    expect(piatti.length).toBeGreaterThan(5);

    /*
     * Il punto: nessuna di queste voci deve raggiungere un cliente prima che
     * il ristoratore l'abbia guardata. Un listino inventato pubblicato per
     * sbaglio è peggio di un menu vuoto — sono prezzi che non sono i suoi.
     */
    expect(piatti.every((p) => p.available === false)).toBe(true);

    // E gli allergeni ci sono già dove il piatto li ha per forza: è
    // l'obbligo che costa da 3.000 a 24.000 euro.
    const tiramisu = piatti.find((p) => p.name === "Tiramisù");
    expect(tiramisu?.allergens).toEqual(
      expect.arrayContaining(["glutine", "uova", "latte"])
    );
  } finally {
    await sql.end();
  }
});

test("il sushi separa il banco del crudo dalla cucina", async ({ page }) => {
  const sql = db();

  try {
    await entra(page);
    await applica(page, /Sushi/i);

    const cat = await sql<{ name: string; reparto: string }[]>`
      select name, reparto from menu_categories
       where venue_id = ${venue.venueId}`;
    const perNome = new Map(cat.map((c) => [c.name, c.reparto]));

    /*
     * In un sushi il crudo lo fa una persona e i fritti e il wok un'altra,
     * su due postazioni diverse. Mandando tutto in "cucina" i due si vedono
     * le comande a vicenda e nessuno dei due sa quali siano sue.
     */
    expect(perNome.get("Nigiri")).toBe("sushi");
    expect(perNome.get("Sashimi")).toBe("sushi");
    expect(perNome.get("Fritti")).toBe("cucina");
    expect(perNome.get("Wok e riso")).toBe("cucina");
  } finally {
    await sql.end();
  }
});

test("la steak house manda le carni alla griglia, non alla cucina", async ({
  page,
}) => {
  const sql = db();

  try {
    await entra(page);
    await applica(page, /steak house/i);

    const cat = await sql<{ name: string; reparto: string }[]>`
      select name, reparto from menu_categories
       where venue_id = ${venue.venueId}`;
    const perNome = new Map(cat.map((c) => [c.name, c.reparto]));

    // Chi gira le carni non prepara gli antipasti, e i tempi sono diversi.
    expect(perNome.get("Tagli di carne")).toBe("griglia");
    expect(perNome.get("Antipasti")).toBe("cucina");
  } finally {
    await sql.end();
  }
});
