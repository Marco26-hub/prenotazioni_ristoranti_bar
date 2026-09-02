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
                          subscription_status, subscription_period_end)
      values (${user.id}, 'E2E Test Venue', ${slug}, 'EUR',
              'active', now() + interval '30 days')
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
    await sql`delete from table_sessions where venue_id = ${venue.venueId}`;
    await sql`delete from reservations where venue_id = ${venue.venueId}`;
    await sql`delete from menu_items where venue_id = ${venue.venueId}`;
    await sql`delete from menu_categories where venue_id = ${venue.venueId}`;
    await sql`delete from tables where venue_id = ${venue.venueId}`;
    await sql`delete from venue_staff where venue_id = ${venue.venueId}`;
    await sql`delete from venues where id = ${venue.venueId}`;
    await sql`delete from users where id = ${venue.userId}`;
  } finally {
    await sql.end();
  }
}
