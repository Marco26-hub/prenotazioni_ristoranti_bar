import { test, expect } from "@playwright/test";
import {
  createTestVenue,
  deleteTestVenue,
  createTestStaff,
  apriTavoloConComanda,
  statoRiga,
  impostaReparto,
  chiamateAperte,
  type TestVenue,
} from "./fixtures";

/**
 * Permessi di ruolo e di reparto, trattenute e chiamate dal tavolo.
 *
 * Sono le aree aggiunte per lavorare con più camerieri su dispositivi
 * diversi, e finora erano verificate solo a mano contro la produzione. Sono
 * anche le più facili da rompere senza accorgersene: un permesso che smette
 * di applicarsi non dà errore, lascia semplicemente passare tutti.
 *
 * I controlli veri stanno nelle Server Action, non nei bottoni: la UI si può
 * aggirare conoscendo l'id dell'action, quindi qui si passa dall'interfaccia
 * ma si verifica il database.
 */

const DASHBOARD_URL = process.env.E2E_DASHBOARD_URL ?? "http://localhost:3011";
const GUEST_URL = process.env.E2E_GUEST_URL ?? "http://localhost:3010";

/*
 * Un locale per test, non uno per file.
 *
 * Condividendolo, ogni test lasciava al successivo i suoi tavoli aperti e le
 * sue chiamate: i conteggi diventavano dipendenti dall'ordine di esecuzione e
 * fallivano per ragioni che non riguardavano il codice in prova. Creare un
 * locale costa poche query e rende ogni test leggibile da solo.
 */
let venue: TestVenue;

test.beforeEach(async () => {
  venue = await createTestVenue();
});

test.afterEach(async () => {
  await deleteTestVenue(venue);
});

async function entra(
  page: import("@playwright/test").Page,
  email: string,
  password: string
) {
  await page.goto(`${DASHBOARD_URL}/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /Accedi/i }).click();
  // Non si aspetta l'URL: l'host contiene già la parola "dashboard".
  await page.getByRole("button", { name: /^Esci$/i }).waitFor({ state: "visible" });
}

/* ------------------------------------------------------------------ */
/* Ruoli                                                               */
/* ------------------------------------------------------------------ */

test("la cucina può dichiarare pronto ma non servito", async ({ page }) => {
  const cuoco = await createTestStaff(venue, "kitchen");
  const { orderItemId } = await apriTavoloConComanda(venue, "preparing");

  await entra(page, cuoco.email, cuoco.password);
  await page.goto(`${DASHBOARD_URL}/dashboard/orders`);

  // Il cuoco porta la riga a "pronto": è la sua parola.
  await page.getByRole("button", { name: /Segna pronto/i }).first().click();
  await expect
    .poll(async () => (await statoRiga(orderItemId)).status, { timeout: 15_000 })
    .toBe("ready");

  // Da lì in poi il bottone che porterebbe a "servito" non gli compare:
  // quella è la parola della sala.
  await page.reload();
  await expect(page.getByRole("button", { name: /Segna servito/i })).toHaveCount(0);
  expect((await statoRiga(orderItemId)).status).toBe("ready");
});

test("la sala può dichiarare servito ma non pronto", async ({ page }) => {
  const cameriere = await createTestStaff(venue, "waiter");
  const { orderItemId } = await apriTavoloConComanda(venue, "ready");

  await entra(page, cameriere.email, cameriere.password);
  await page.goto(`${DASHBOARD_URL}/dashboard/orders`);

  await page.getByRole("button", { name: /Segna servito/i }).first().click();
  await expect
    .poll(async () => (await statoRiga(orderItemId)).status, { timeout: 15_000 })
    .toBe("served");

  // Su una riga in preparazione il cameriere non deve poter dire "pronto":
  // starebbe indovinando che il piatto esiste.
  const seconda = await apriTavoloConComanda(venue, "preparing");
  await page.reload();
  await expect(page.getByRole("button", { name: /Segna pronto/i })).toHaveCount(0);
  expect((await statoRiga(seconda.orderItemId)).status).toBe("preparing");
});

/* ------------------------------------------------------------------ */
/* Reparti                                                             */
/* ------------------------------------------------------------------ */

test("chi opera solo al bar non muove le comande della cucina", async ({ page }) => {
  await impostaReparto(venue, "Test", "cucina");
  const barista = await createTestStaff(venue, "kitchen", ["bar"]);
  const { orderItemId } = await apriTavoloConComanda(venue, "sent_to_kitchen");

  await entra(page, barista.email, barista.password);
  await page.goto(`${DASHBOARD_URL}/dashboard/orders`);

  // Il filtro dello schermo si può togliere: quello che conta è che
  // l'azione, comunque la si raggiunga, non produca alcun effetto.
  const bottone = page.getByRole("button", { name: /Metti in preparazione/i }).first();
  if (await bottone.count()) await bottone.click();
  await page.waitForTimeout(3000);

  expect((await statoRiga(orderItemId)).status).toBe("sent_to_kitchen");
});

/* ------------------------------------------------------------------ */
/* Trattenere                                                          */
/* ------------------------------------------------------------------ */

test("un piatto trattenuto non parte con l'azione di tavolo", async ({ page }) => {
  await impostaReparto(venue, "Test", "cucina");
  const { orderItemId, tableCode } = await apriTavoloConComanda(
    venue,
    "sent_to_kitchen"
  );

  await entra(page, venue.email, venue.password);
  await page.goto(`${DASHBOARD_URL}/dashboard/orders`);

  // Ristretto alla card di questo tavolo: sul monitor ce ne sono altri
  // lasciati dai test precedenti, e il primo bottone sarebbe di un altro.
  const card = page.locator("li").filter({ hasText: tableCode }).first();
  await card.getByRole("button", { name: /^Ritarda / }).first().click();
  await expect
    .poll(async () => (await statoRiga(orderItemId)).trattenuto, { timeout: 15_000 })
    .toBe(true);

  // "Tutto in preparazione" deve saltarlo: trattenerlo è stata una decisione
  // esplicita e un tocco solo non deve scavalcarla.
  const inBlocco = card.getByRole("button", { name: /Tutto in preparazione/i });
  if (await inBlocco.count()) await inBlocco.first().click();
  await page.waitForTimeout(3000);

  const dopo = await statoRiga(orderItemId);
  expect(dopo.status).toBe("sent_to_kitchen");
  expect(dopo.trattenuto).toBe(true);

  // Liberandolo torna disponibile.
  await page.reload();
  await page
    .locator("li")
    .filter({ hasText: tableCode })
    .first()
    .getByRole("button", { name: /^Manda ora / })
    .first()
    .click();
  await expect
    .poll(async () => (await statoRiga(orderItemId)).trattenuto, { timeout: 15_000 })
    .toBe(false);
});

/* ------------------------------------------------------------------ */
/* Chiamata dal tavolo                                                 */
/* ------------------------------------------------------------------ */

test("premere due volte non accumula due richieste in sala", async () => {
  const { sessionId } = await apriTavoloConComanda(venue, "served");

  /*
   * Verificato sulla garanzia e non sul giro HTTP.
   *
   * L'endpoint pubblico ha un limite di sei chiamate all'ora per indirizzo:
   * è la protezione giusta — chi non vede arrivare nessuno preme, ed è
   * comprensibile — ma rende il test dipendente da quante volte quello
   * stesso IP ha chiamato prima, cioè instabile per ragioni che non
   * riguardano il codice.
   *
   * Quello che il test deve difendere è che due richieste dello stesso tipo
   * sullo stesso tavolo restino una riga sola: è l'indice unico a garantirlo,
   * ed è quello che si rompe se qualcuno lo tocca.
   */
  const sql = (await import("postgres")).default(process.env.DATABASE_URL!, {
    ssl: "require",
    prepare: false,
  });

  try {
    const inserisci = (documento: string) => sql`
      insert into table_calls (venue_id, table_session_id, motivo, documento)
      values (${venue.venueId}, ${sessionId}, 'contanti', ${documento})
      on conflict (table_session_id, motivo) where handled_at is null
      do update set documento = excluded.documento, created_at = now()`;

    await inserisci("fattura");
    await inserisci("scontrino");

    const aperte = await chiamateAperte(venue);
    expect(aperte).toHaveLength(1);
    // L'ultima richiesta vince: è quella che il cliente ha davvero scelto.
    expect(aperte[0].documento).toBe("scontrino");
  } finally {
    await sql.end();
  }
});

test("una chiamata su un tavolo chiuso non risulta più aperta", async () => {
  const { sessionId } = await apriTavoloConComanda(venue, "served");

  // Il token è quello del tavolo: la chiamata nasce sulla sessione aperta.
  const sql = (await import("postgres")).default(process.env.DATABASE_URL!, {
    ssl: "require",
    prepare: false,
  });
  try {
    await sql`
      insert into table_calls (venue_id, table_session_id, motivo, documento)
      values (${venue.venueId}, ${sessionId}, 'contanti', 'scontrino')`;

    expect(await chiamateAperte(venue)).toHaveLength(1);

    // Chiuso il conto, la chiamata non deve continuare a suonare su un
    // tavolo ormai vuoto.
    await sql`
      update table_sessions set status = 'closed', closed_at = now()
       where id = ${sessionId}`;

    expect(await chiamateAperte(venue)).toHaveLength(0);
  } finally {
    await sql.end();
  }
});
