import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createTestVenue, deleteTestVenue, type TestVenue } from "./fixtures";

/**
 * L'aritmetica del conto, caso per caso.
 *
 * `contoSessione` è l'unico posto dove si decide quanto deve un tavolo: ci
 * passano il conto sul telefono, la chiusura in cassa, il residuo mostrato
 * in sala e le righe della fattura. Un errore qui non dà nessun errore — dà
 * un numero plausibile che qualcuno paga, o che il locale non incassa.
 *
 * Le combinazioni si montano direttamente nel database perché è lì che vive
 * il calcolo: verificarlo con dei finti non proverebbe niente, la logica sta
 * nella query.
 */

const GUEST_URL = process.env.E2E_GUEST_URL ?? "http://localhost:3010";

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL mancante per i test E2E");
  return postgres(url, { ssl: "require", prepare: false });
}

let venue: TestVenue;
let sql: ReturnType<typeof db>;

test.beforeEach(async () => {
  venue = await createTestVenue();
  sql = db();
});

test.afterEach(async () => {
  await sql.end();
  await deleteTestVenue(venue);
});

/** Apre una sessione e ci mette dentro n copie del piatto di prova. */
async function tavoloCon(opzioni: {
  quantita?: number;
  /** Ore fa in cui il tavolo si è seduto: serve alle fasce orarie. */
  apertoOreFa?: number;
  coperti?: number;
  bambini?: number;
  formula?: boolean;
  supplementoCents?: number;
  fuoriFormula?: boolean;
  annullato?: boolean;
}) {
  const {
    quantita = 1,
    apertoOreFa = 0,
    coperti = 1,
    bambini = 0,
    formula = false,
    supplementoCents = 0,
    fuoriFormula = false,
    annullato = false,
  } = opzioni;

  const [tavolo] = await sql<{ id: string }[]>`
    select id from tables where venue_id = ${venue.venueId} order by code limit 1`;

  const [sessione] = await sql<{ id: string }[]>`
    insert into table_sessions
      (table_id, venue_id, status, guest_count, bambini, formula,
       supplemento_cents, opened_at)
    values (${tavolo.id}, ${venue.venueId}, 'open', ${coperti}, ${bambini},
            ${formula}, ${supplementoCents},
            now() - make_interval(hours => ${apertoOreFa}))
    returning id`;

  await sql`
    update menu_items set fuori_formula = ${fuoriFormula}
     where venue_id = ${venue.venueId}`;

  const [piatto] = await sql<{ id: string; price_cents: number }[]>`
    select id, price_cents from menu_items where venue_id = ${venue.venueId} limit 1`;

  const [ordine] = await sql<{ id: string }[]>`
    insert into orders (venue_id, table_session_id, status)
    values (${venue.venueId}, ${sessione.id}, ${annullato ? "cancelled" : "confirmed"})
    returning id`;

  await sql`
    insert into order_items (order_id, menu_item_id, quantity, unit_price_cents, status)
    values (${ordine.id}, ${piatto.id}, ${quantita}, ${piatto.price_cents},
            'sent_to_kitchen')`;

  return { sessionId: sessione.id, prezzoPiatto: piatto.price_cents };
}

async function conto(request: import("@playwright/test").APIRequestContext, sessionId: string) {
  const r = await request.get(`${GUEST_URL}/api/bill?sessionId=${sessionId}`);
  expect(r.ok(), `il conto ha risposto ${r.status()}`).toBeTruthy();
  return r.json();
}

/* ------------------------------------------------------------------ */
/* Alla carta                                                          */
/* ------------------------------------------------------------------ */

test("alla carta: piatti più coperto più servizio", async ({ request }) => {
  await sql`
    update venues set cover_charge_cents = 200, service_percent = 10
     where id = ${venue.venueId}`;

  const { sessionId, prezzoPiatto } = await tavoloCon({ quantita: 2, coperti: 3 });
  const c = await conto(request, sessionId);

  const ordinato = prezzoPiatto * 2;
  const coperto = 200 * 3;
  const servizio = Math.round((ordinato * 10) / 100);
  expect(c.balanceCents).toBe(ordinato + coperto + servizio);
});

test("un tavolo che non ha ordinato non deve né coperto né servizio", async ({
  request,
}) => {
  await sql`
    update venues set cover_charge_cents = 200, service_percent = 10
     where id = ${venue.venueId}`;

  // Sessione aperta e ordine annullato: il QR inquadrato e poi lasciato lì.
  const { sessionId } = await tavoloCon({ annullato: true, coperti: 4 });
  const c = await conto(request, sessionId);

  expect(c.balanceCents).toBe(0);
  expect(c.coperto).toBeNull();
});

test("le righe annullate non entrano nel conto", async ({ request }) => {
  const { sessionId } = await tavoloCon({ quantita: 3 });
  await sql`
    update order_items set status = 'cancelled'
     where order_id in (select id from orders where table_session_id = ${sessionId})`;

  const c = await conto(request, sessionId);
  expect(c.balanceCents).toBe(0);
});

/* ------------------------------------------------------------------ */
/* Formula                                                             */
/* ------------------------------------------------------------------ */

test("i bambini non possono superare i coperti", async ({ request }) => {
  await sql`
    update venues set formula_attiva = true, formula_pranzo_cents = 3000,
                      formula_cena_cents = 3000, formula_bambino_cents = 1000
     where id = ${venue.venueId}`;

  // Due coperti, ma cinque bambini segnati per errore: senza il taglio, gli
  // adulti diventerebbero -3 e il conto scenderebbe sotto zero.
  const { sessionId } = await tavoloCon({ coperti: 2, bambini: 5, formula: true });
  const c = await conto(request, sessionId);

  expect(c.formula.adulti).toBe(0);
  expect(c.formula.bambini).toBe(2);
  expect(c.balanceCents).toBe(2000);
});

test("la fascia la decide l'ora in cui il tavolo si è seduto", async ({ request }) => {
  await sql`
    update venues set formula_attiva = true,
                      formula_pranzo_cents = 2000, formula_cena_cents = 4000,
                      formula_ora_cena = '18:00', timezone = 'Europe/Rome'
     where id = ${venue.venueId}`;

  // Seduto otto ore fa: comunque vada, la fascia deve essere quella
  // dell'apertura e non quella di adesso.
  const { sessionId } = await tavoloCon({ apertoOreFa: 8, formula: true });
  const c = await conto(request, sessionId);

  const [riga] = await sql<{ ora: number }[]>`
    select extract(hour from (ts.opened_at at time zone 'Europe/Rome'))::int as ora
      from table_sessions ts where ts.id = ${sessionId}`;

  const attesa = riga.ora >= 18 ? 4000 : 2000;
  expect(c.formula.prezzoUnitarioCents).toBe(attesa);
  expect(c.balanceCents).toBe(attesa);
});

test("formula attiva ma senza prezzo per quella fascia: si torna alla carta", async ({
  request,
}) => {
  // Cena impostata, pranzo a zero: un tavolo seduto quando vale il pranzo
  // non deve pagare zero, deve pagare i piatti.
  await sql`
    update venues set formula_attiva = true, formula_pranzo_cents = 0,
                      formula_cena_cents = 0
     where id = ${venue.venueId}`;

  const { sessionId, prezzoPiatto } = await tavoloCon({ formula: true, quantita: 2 });
  const c = await conto(request, sessionId);

  expect(c.formula).toBeNull();
  expect(c.balanceCents).toBe(prezzoPiatto * 2);
});

test("il supplemento per l'avanzato si somma una volta, non per persona", async ({
  request,
}) => {
  await sql`
    update venues set formula_attiva = true, formula_pranzo_cents = 3000,
                      formula_cena_cents = 3000, formula_supplemento_cents = 500
     where id = ${venue.venueId}`;

  const { sessionId } = await tavoloCon({ coperti: 4, formula: true, supplementoCents: 500 });
  const c = await conto(request, sessionId);

  expect(c.balanceCents).toBe(4 * 3000 + 500);
  expect(c.formula.supplementoCents).toBe(500);
});

test("formula, fuori formula, coperto e servizio tutti insieme", async ({ request }) => {
  await sql`
    update venues set formula_attiva = true, formula_pranzo_cents = 3000,
                      formula_cena_cents = 3000, cover_charge_cents = 200,
                      service_percent = 10, formula_bambino_cents = 0
     where id = ${venue.venueId}`;

  const { sessionId, prezzoPiatto } = await tavoloCon({
    coperti: 3,
    bambini: 1,
    formula: true,
    fuoriFormula: true,
    quantita: 2,
  });
  const c = await conto(request, sessionId);

  const formula = 2 * 3000; // due adulti, un bambino gratis
  const extra = prezzoPiatto * 2;
  const coperto = 200 * 3;
  // Il servizio si calcola su formula + extra, non sul coperto.
  const servizio = Math.round(((formula + extra) * 10) / 100);

  expect(c.balanceCents).toBe(formula + extra + coperto + servizio);
  expect(c.servizio.totaleCents).toBe(servizio);
});

/* ------------------------------------------------------------------ */
/* Pagamenti                                                           */
/* ------------------------------------------------------------------ */

test("un pagamento parziale lascia esattamente il resto", async ({ request }) => {
  const { sessionId, prezzoPiatto } = await tavoloCon({ quantita: 4 });

  await sql`
    insert into payments (venue_id, table_session_id, amount_cents, method,
                          provider, split_type, status)
    values (${venue.venueId}, ${sessionId}, ${prezzoPiatto}, 'card', 'stripe',
            'per_item', 'succeeded')`;

  const c = await conto(request, sessionId);
  expect(c.balanceCents).toBe(prezzoPiatto * 3);
});

test("chi ha pagato più del dovuto non risulta a debito", async ({ request }) => {
  const { sessionId, prezzoPiatto } = await tavoloCon({ quantita: 1 });

  await sql`
    insert into payments (venue_id, table_session_id, amount_cents, method,
                          provider, split_type, status)
    values (${venue.venueId}, ${sessionId}, ${prezzoPiatto * 3}, 'card', 'stripe',
            'full', 'succeeded')`;

  const c = await conto(request, sessionId);
  // Mai negativo: il saldo residuo è quello che resta da incassare.
  expect(c.balanceCents).toBe(0);
  expect(c.paidCents).toBe(prezzoPiatto * 3);
});

test("un pagamento fallito non scala niente", async ({ request }) => {
  const { sessionId, prezzoPiatto } = await tavoloCon({ quantita: 2 });

  await sql`
    insert into payments (venue_id, table_session_id, amount_cents, method,
                          provider, split_type, status)
    values (${venue.venueId}, ${sessionId}, ${prezzoPiatto * 2}, 'card', 'stripe',
            'full', 'failed')`;

  const c = await conto(request, sessionId);
  expect(c.balanceCents).toBe(prezzoPiatto * 2);
});
