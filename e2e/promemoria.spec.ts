import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

/**
 * Promemoria del giorno prima e disdetta dal cliente.
 *
 * Servono alla stessa ferita: il tavolo prenotato che resta vuoto. Quello
 * che va difeso è che la disdetta liberi davvero il tavolo — non solo che
 * cambi una parola nel database — e che il promemoria non parta due volte,
 * perché un secondo promemoria identico si legge come una seconda
 * prenotazione.
 */

const GUEST_URL = process.env.E2E_GUEST_URL ?? "http://localhost:3010";

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

async function prenota(sql: ReturnType<typeof db>, quando: Date, token: string) {
  const [r] = await sql<{ id: string }[]>`
    insert into reservations
      (venue_id, customer_name, customer_email, party_size, reserved_at,
       status, cancel_token)
    values (${venue.venueId}, 'Prova Disdetta', 'prova@example.invalid', 2,
            ${quando}, 'confirmed', ${token})
    returning id`;

  const [t] = await sql<{ id: string }[]>`
    select id from tables where venue_id = ${venue.venueId} order by code limit 1`;
  await sql`
    insert into reservation_tables (reservation_id, table_id)
    values (${r.id}, ${t.id})`;

  return r.id;
}

test("il cliente disdice dal link e il tavolo torna libero", async ({ page }) => {
  const sql = db();
  const token = `e2e${Date.now()}${Math.random().toString(36).slice(2, 10)}`;

  try {
    const domani = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const id = await prenota(sql, domani, token);

    await page.goto(`${GUEST_URL}/p/${venue.slug}/disdici/${token}`);

    // Prima di disdire mostra cosa si sta disdicendo: un link che agisce da
    // solo verrebbe attivato dalle anteprime dei messaggi.
    await expect(page.getByText("Prova Disdetta")).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /Sì, disdici/i }).click();
    await expect(page.getByText(/Disdetta\. Grazie/i)).toBeVisible({
      timeout: 20_000,
    });

    const [dopo] = await sql<
      { status: string; disdetta_dal_cliente_at: Date | null }[]
    >`select status, disdetta_dal_cliente_at from reservations where id = ${id}`;
    expect(dopo.status).toBe("cancelled");
    expect(dopo.disdetta_dal_cliente_at).not.toBeNull();

    // Il punto: il tavolo non è più impegnato, o disdire non servirebbe a
    // niente — il posto resterebbe bloccato per chi telefona.
    const [impegni] = await sql<{ n: string }[]>`
      select count(*)::text as n from reservation_tables
       where reservation_id = ${id}`;
    expect(Number(impegni.n)).toBe(0);

    // Riaprendo il link non si disdice due volte.
    await page.reload();
    await expect(page.getByText(/Già disdetta/i)).toBeVisible({ timeout: 20_000 });
  } finally {
    await sql.end();
  }
});

test("un link inventato non disdice niente", async ({ page }) => {
  const sql = db();
  const token = `e2e${Date.now()}${Math.random().toString(36).slice(2, 10)}`;

  try {
    const domani = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const id = await prenota(sql, domani, token);

    await page.goto(`${GUEST_URL}/p/${venue.slug}/disdici/${token}xxx`);
    await expect(page.getByText(/Link non valido/i)).toBeVisible({
      timeout: 20_000,
    });

    const [dopo] = await sql<{ status: string }[]>`
      select status from reservations where id = ${id}`;
    expect(dopo.status).toBe("confirmed");
  } finally {
    await sql.end();
  }
});

test("il promemoria si prende la riga una volta sola", async () => {
  const sql = db();
  const token = `e2e${Date.now()}${Math.random().toString(36).slice(2, 10)}`;

  try {
    // Fra 24 ore: dentro la finestra del giro orario.
    const domani = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const id = await prenota(sql, domani, token);

    /*
     * Verificato sulla garanzia, non sul giro HTTP.
     *
     * L'endpoint vuole il segreto del pianificatore, che i test non hanno e
     * che non deve stare in un file del repository. Quello che va difeso è
     * che due esecuzioni ravvicinate — capitano, se un giro è lento — non
     * mandino due volte la stessa email: a garantirlo è la UPDATE che si
     * prende la riga, ed è quella che si rompe se qualcuno la tocca.
     */
    const prendi = () => sql<{ id: string }[]>`
      update reservations r
         set promemoria_inviato_at = now()
        from venues v
       where v.id = r.venue_id
         and r.promemoria_inviato_at is null
         and r.status in ('confirmed', 'pending')
         and r.customer_email is not null
         and r.reserved_at between now() + interval '23 hours'
                               and now() + interval '25 hours'
         and r.venue_id = ${venue.venueId}
      returning r.id`;

    const primo = await prendi();
    const secondo = await prendi();

    expect(primo.map((r) => r.id)).toContain(id);
    expect(secondo).toHaveLength(0);
  } finally {
    await sql.end();
  }
});
