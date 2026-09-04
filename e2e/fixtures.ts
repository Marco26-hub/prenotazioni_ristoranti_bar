import postgres from "postgres";
import bcrypt from "bcryptjs";

/**
 * I test girano contro il database reale (non c'è un'istanza separata), quindi
 * ogni run crea il proprio locale isolato con uno slug unico e lo cancella
 * alla fine — mai toccare i dati di locali veri.
 */

export interface TestVenue {
  venueId: string;
  userId: string;
  slug: string;
  qrToken: string;
  email: string;
  password: string;
  menuItemName: string;
  menuItemPriceCents: number;
}

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL mancante per i test E2E");
  return postgres(url, { ssl: "require", prepare: false });
}

export async function createTestVenue(): Promise<TestVenue> {
  const sql = db();
  const suffix = Math.random().toString(36).slice(2, 10);
  const email = `e2e-${suffix}@test.local`;
  const password = "e2e-test-password";
  const slug = `e2e-${suffix}`;

  try {
    const [user] = await sql<{ id: string }[]>`
      insert into users (email, password_hash, name)
      values (${email}, ${bcrypt.hashSync(password, 10)}, 'E2E Tester')
      returning id`;

    const [venue] = await sql<{ id: string }[]>`
      insert into venues (owner_id, name, slug, currency,
                          subscription_status, subscription_period_end, modules)
      values (${user.id}, 'E2E Test Venue', ${slug}, 'EUR',
              'active', now() + interval '30 days',
              array['ordini','prenotazioni'])
      returning id`;

    await sql`insert into venue_staff (venue_id, user_id, role)
      values (${venue.id}, ${user.id}, 'owner')`;

    const [table] = await sql<{ qr_token: string }[]>`
      insert into tables (venue_id, code, seats)
      values (${venue.id}, 'T1', 4)
      returning qr_token`;

    const [category] = await sql<{ id: string }[]>`
      insert into menu_categories (venue_id, name, sort_order)
      values (${venue.id}, 'Test', 1)
      returning id`;

    await sql`
      insert into menu_items (venue_id, category_id, name, price_cents, vat_rate, sort_order)
      values (${venue.id}, ${category.id}, 'Piatto Test', 1500, 10, 1)`;

    const [dessertCategory] = await sql<{ id: string }[]>`
      insert into menu_categories (venue_id, name, sort_order)
      values (${venue.id}, 'Dolci', 2)
      returning id`;

    await sql`
      insert into menu_items (venue_id, category_id, name, price_cents, vat_rate, sort_order)
      values (${venue.id}, ${dessertCategory.id}, 'Dolce Test', 700, 10, 1)`;

    return {
      venueId: venue.id,
      userId: user.id,
      slug,
      qrToken: table.qr_token,
      email,
      password,
      menuItemName: "Piatto Test",
      menuItemPriceCents: 1500,
    };
  } finally {
    await sql.end();
  }
}

export async function deleteTestVenue(venue: TestVenue): Promise<void> {
  const sql = db();
  try {
    // Ordine di cancellazione dettato dalle foreign key.
    await sql`delete from payment_order_items where payment_id in (
      select id from payments where venue_id = ${venue.venueId})`;
    await sql`delete from invoices where venue_id = ${venue.venueId}`;
    await sql`delete from payments where venue_id = ${venue.venueId}`;
    await sql`delete from order_items where order_id in (
      select id from orders where venue_id = ${venue.venueId})`;
    await sql`delete from orders where venue_id = ${venue.venueId}`;
    await sql`delete from table_calls where venue_id = ${venue.venueId}`;
    await sql`delete from order_item_events where venue_id = ${venue.venueId}`;
    await sql`delete from venue_devices where venue_id = ${venue.venueId}`;
    await sql`delete from table_sessions where venue_id = ${venue.venueId}`;
    await sql`delete from reservation_tables where reservation_id in (
      select id from reservations where venue_id = ${venue.venueId})`;
    await sql`delete from reservations where venue_id = ${venue.venueId}`;
    await sql`delete from menu_items where venue_id = ${venue.venueId}`;
    await sql`delete from menu_categories where venue_id = ${venue.venueId}`;
    await sql`delete from tables where venue_id = ${venue.venueId}`;
    await sql`delete from support_tickets where venue_id = ${venue.venueId}`;
    await sql`delete from venue_notes where venue_id = ${venue.venueId}`;
    await sql`delete from venue_staff where venue_id = ${venue.venueId}`;
    await sql`delete from venues where id = ${venue.venueId}`;
    await sql`delete from users where id = ${venue.userId}`;
  } finally {
    await sql.end();
  }
}

/**
 * Un addetto in più nello stesso locale, con ruolo e reparti.
 *
 * Serve ai test sui permessi: senza un secondo account non si può verificare
 * che la cucina non possa segnare "servito", perché il titolare può tutto.
 */
export async function createTestStaff(
  venue: TestVenue,
  role: "manager" | "waiter" | "kitchen",
  reparti: string[] = []
): Promise<{ userId: string; email: string; password: string }> {
  const sql = db();
  const suffix = Math.random().toString(36).slice(2, 10);
  const email = `e2e-${role}-${suffix}@test.local`;
  const password = "e2e-test-password";

  try {
    const [user] = await sql<{ id: string }[]>`
      insert into users (email, password_hash, name)
      values (${email}, ${bcrypt.hashSync(password, 10)}, ${`E2E ${role}`})
      returning id`;

    await sql`
      insert into venue_staff (venue_id, user_id, role, reparti)
      values (${venue.venueId}, ${user.id}, ${role}, ${reparti})`;

    return { userId: user.id, email, password };
  } finally {
    await sql.end();
  }
}

/** Un tavolo aperto con una riga di comanda, allo stato richiesto. */
export async function apriTavoloConComanda(
  venue: TestVenue,
  stato = "sent_to_kitchen"
): Promise<{
  sessionId: string;
  orderItemId: string;
  tableCode: string;
  qrToken: string;
}> {
  const sql = db();
  try {
    // Un tavolo nuovo a ogni chiamata: c'è un indice che vieta due sessioni
    // aperte sullo stesso tavolo — è la protezione contro due scansioni
    // quasi simultanee dello stesso QR — e riusarne uno solo farebbe
    // fallire il secondo test che apre un conto.
    const code = "T" + Math.random().toString(36).slice(2, 7);
    const [tavolo] = await sql<{ id: string; qr_token: string }[]>`
      insert into tables (venue_id, code, seats)
      values (${venue.venueId}, ${code}, 4)
      returning id, qr_token`;
    const [piatto] = await sql<{ id: string; price_cents: number }[]>`
      select id, price_cents from menu_items
       where venue_id = ${venue.venueId} and name = ${venue.menuItemName}`;

    const [sessione] = await sql<{ id: string }[]>`
      insert into table_sessions (table_id, venue_id, status, guest_count)
      values (${tavolo.id}, ${venue.venueId}, 'open', 2)
      returning id`;

    const [ordine] = await sql<{ id: string }[]>`
      insert into orders (venue_id, table_session_id, status)
      values (${venue.venueId}, ${sessione.id}, 'confirmed')
      returning id`;

    const [riga] = await sql<{ id: string }[]>`
      insert into order_items (order_id, menu_item_id, quantity,
                               unit_price_cents, status)
      values (${ordine.id}, ${piatto.id}, 1, ${piatto.price_cents}, ${stato})
      returning id`;

    return {
      sessionId: sessione.id,
      orderItemId: riga.id,
      tableCode: code,
      qrToken: tavolo.qr_token,
    };
  } finally {
    await sql.end();
  }
}

/** Lo stato attuale di una riga, letto direttamente dal database. */
export async function statoRiga(orderItemId: string): Promise<{
  status: string;
  trattenuto: boolean;
}> {
  const sql = db();
  try {
    const [r] = await sql<{ status: string; held_at: Date | null }[]>`
      select status, held_at from order_items where id = ${orderItemId}`;
    return { status: r.status, trattenuto: r.held_at !== null };
  } finally {
    await sql.end();
  }
}

/** Il reparto di una categoria, per i test sui permessi. */
export async function impostaReparto(
  venue: TestVenue,
  categoria: string,
  reparto: string
): Promise<void> {
  const sql = db();
  try {
    await sql`
      update menu_categories set reparto = ${reparto}
       where venue_id = ${venue.venueId} and name = ${categoria}`;
  } finally {
    await sql.end();
  }
}

/** Chiamate aperte del locale. */
export async function chiamateAperte(venue: TestVenue): Promise<
  { motivo: string; documento: string | null }[]
> {
  const sql = db();
  try {
    return await sql<{ motivo: string; documento: string | null }[]>`
      select c.motivo, c.documento
        from table_calls c
        join table_sessions ts on ts.id = c.table_session_id
       where c.venue_id = ${venue.venueId}
         and c.handled_at is null and ts.status = 'open'`;
  } finally {
    await sql.end();
  }
}
