/**
 * Cattura i fotogrammi della guida "Ordina e paga al tavolo".
 *
 * Sono schermate vere della produzione, non mockup: una guida disegnata a
 * mano invecchia al primo ritocco dell'interfaccia e insegna qualcosa che
 * non esiste più. Qui basta rilanciare lo script.
 *
 *   node guida/cattura.mjs
 *
 * Il tavolo di lavoro viene ripulito alla fine, così la guida si può
 * rifare quante volte serve senza lasciare sessioni aperte in sala.
 */

import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import postgres from "postgres";

const GUEST = "https://ristoranti-guest.vercel.app";
const SLUG = "trattoria-da-luca";
const TAVOLO = process.env.TAVOLO ?? "T3";
const USCITA = "guida/public/passi";

for (const riga of readFileSync("apps/dashboard/.env.local", "utf8").split("\n")) {
  const m = riga.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });

const [tavolo] = await sql`
  select t.id, t.code, t.qr_token
    from tables t join venues v on v.id = t.venue_id
   where v.slug = ${SLUG} and t.code = ${TAVOLO}`;

if (!tavolo) {
  console.error(`Tavolo ${TAVOLO} non trovato`);
  process.exit(1);
}

async function pulisci() {
  const sessioni = await sql`
    select id from table_sessions where table_id = ${tavolo.id} and status = 'open'`;
  for (const s of sessioni) {
    await sql`delete from table_calls where table_session_id = ${s.id}`;
    await sql`delete from order_items where order_id in (
                select id from orders where table_session_id = ${s.id})`;
    await sql`delete from orders where table_session_id = ${s.id}`;
    await sql`delete from payments where table_session_id = ${s.id}`;
    await sql`delete from table_sessions where id = ${s.id}`;
  }
  return sessioni.length;
}

mkdirSync(USCITA, { recursive: true });
console.log(`Pulite ${await pulisci()} sessioni precedenti su ${tavolo.code}`);

const browser = await chromium.launch();
// iPhone 13: è il formato in cui il cliente vede davvero il menu.
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: "it-IT",
});
const page = await context.newPage();

let n = 0;
async function scatta(nome, didascalia) {
  n += 1;
  const file = `${USCITA}/${String(n).padStart(2, "0")}-${nome}.png`;
  await page.screenshot({ path: file });
  console.log(`  ${file}  — ${didascalia}`);
  return { file, didascalia };
}

const passi = [];

await page.goto(`${GUEST}/v/${SLUG}/t/${tavolo.qr_token}`, {
  waitUntil: "networkidle",
});
passi.push(await scatta("menu", "Inquadra il QR sul tavolo: si apre il menu, senza scaricare niente"));

// Scheda del piatto: allergeni e ingredienti, che per legge devono esserci.
// L'aria-label vince sul testo visibile: il nome accessibile è "Dettagli di …".
await page.getByRole("button", { name: /^Dettagli di/i }).first().click();
await page.waitForTimeout(700);
passi.push(await scatta("scheda", "Ogni piatto apre ingredienti, allergeni e conservazione"));
await page.keyboard.press("Escape").catch(() => {});
await page.waitForTimeout(400);

// Aggiunta al carrello.
const piu = page.getByRole("button", { name: /^Aggiungi / });
await piu.nth(1).click();
await page.waitForTimeout(400);
await piu.nth(3).click();
await page.waitForTimeout(700);
passi.push(await scatta("carrello", "Tocca + per aggiungere: il totale si aggiorna mentre scegli"));

// Invio della comanda.
await page.getByRole("button", { name: /^Ordina/ }).click();
await page.waitForTimeout(2500);
passi.push(await scatta("inviato", "Ordina: la comanda parte in cucina, nessuno deve venire a prenderla"));

// Il conto.
await page.getByRole("link", { name: /Paga ora/i }).first().click();
await page.waitForTimeout(2500);
passi.push(await scatta("conto", "Il conto è sempre aggiornato: si paga quando si vuole"));

// Contanti e chiamata al cameriere.
const contanti = page.getByRole("button", { name: /Pago in contanti/i });
if (await contanti.count()) {
  await contanti.first().click();
  await page.waitForTimeout(700);
  passi.push(await scatta("contanti", "Chi paga in contanti sceglie scontrino o fattura"));
  await page.getByRole("button", { name: /Chiama il cameriere/i }).click();
  await page.waitForTimeout(2000);
  passi.push(await scatta("chiamato", "Il tavolo compare in sala: il cameriere sa già cosa portare"));
}

await browser.close();

console.log(`\n${passi.length} fotogrammi in ${USCITA}`);
console.log(`Ripulite ${await pulisci()} sessioni di lavoro`);
await sql.end();

// L'elenco serve alla composizione Remotion: didascalie e ordine stanno
// qui, accanto agli scatti, non duplicati nel video.
const { writeFileSync } = await import("node:fs");
writeFileSync(
  "guida/src/passi.json",
  JSON.stringify(
    passi.map((p) => ({
      immagine: p.file.replace("guida/public/", ""),
      didascalia: p.didascalia,
    })),
    null,
    2
  ) + "\n"
);
console.log("Didascalie scritte in guida/src/passi.json");
