import postgres from "postgres";
import { createTestVenue, deleteTestVenue } from "./e2e/fixtures";
import { writeFileSync } from "node:fs";

const v = await createTestVenue();
const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", prepare: false });
try {
  const [p] = await sql`select id, price_cents from menu_items
    where venue_id = ${v.venueId} and name = ${v.menuItemName}`;
  const [t] = await sql`insert into tables (venue_id, code, seats)
    values (${v.venueId}, ${"T" + Math.random().toString(36).slice(2, 6)}, 4) returning id`;
  const [s] = await sql`insert into table_sessions (table_id, venue_id, status, guest_count)
    values (${t.id}, ${v.venueId}, 'open', 4) returning id`;
  const [o] = await sql`insert into orders (venue_id, table_session_id, status)
    values (${v.venueId}, ${s.id}, 'confirmed') returning id`;
  for (let i = 0; i < 12; i++) {
    await sql`insert into order_items (order_id, menu_item_id, quantity, unit_price_cents, status)
      values (${o.id}, ${p.id}, 1, ${p.price_cents}, 'sent_to_kitchen')`;
  }
  // La sessione resta viva per la seconda misura: la scrivo su file.
  writeFileSync("/tmp/sessione-misura.txt", `${v.venueId}\n${s.id}\n${v.slug}\n${v.userId}`);

  const url = `http://localhost:3010/api/bill?sessionId=${s.id}`;
  for (let i = 0; i < 3; i++) await fetch(url);
  const tempi: number[] = [];
  for (let i = 0; i < 12; i++) {
    const a = performance.now();
    await (await fetch(url)).text();
    tempi.push(performance.now() - a);
  }
  tempi.sort((x, y) => x - y);
  console.log(`mediana ${Math.round(tempi[6])} ms   minimo ${Math.round(tempi[0])} ms`);
} finally {
  await sql.end();
  // NON cancello il locale: serve alla seconda misura.
}
