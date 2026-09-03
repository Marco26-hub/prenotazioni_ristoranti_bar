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
const ADMIN = "https://ristoranti-dashboard.vercel.app";
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
  return { file, didascalia, larghezza: 1170, altezza: 2532 };
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

// Il conto. "Paga ora" è un'ancora: porta la sezione in pagina ma il
// riepilogo arriva da una fetch, quindi si aspetta il totale, non lo scroll.
await page.getByRole("link", { name: /Paga ora/i }).first().click();
const contanti = page.getByRole("button", { name: /Pago in contanti/i });
await contanti.first().waitFor({ state: "visible", timeout: 20_000 });
await contanti.first().scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
passi.push(await scatta("conto", "Il conto è sempre aggiornato: si paga quando si vuole"));

// Contanti e chiamata al cameriere.
if (await contanti.count()) {
  await contanti.first().click();
  await page.waitForTimeout(700);
  passi.push(await scatta("contanti", "Chi paga in contanti sceglie scontrino o fattura"));
  await page.getByRole("button", { name: /Chiama il cameriere/i }).click();
  await page.waitForTimeout(2000);
  passi.push(await scatta("chiamato", "Il tavolo compare in sala: il cameriere sa già cosa portare"));
}

/* --- Lato sala: cosa vede il locale mentre il cliente ordina ---------- */

// Schermo largo: la sala si guarda dalla cassa o da un tablet, non dal
// telefono, e la pianta ha senso solo con lo spazio per starci dentro.
const sala = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
  locale: "it-IT",
});
const admin = await sala.newPage();

// La radice dell'admin è la pagina di presentazione, non il login.
await admin.goto(`${ADMIN}/login`, { waitUntil: "networkidle" });
// Per tipo e non per etichetta: la label non è associata all'input.
await admin.locator('input[type="email"]').fill(process.env.GUIDA_EMAIL ?? "");
await admin.locator('input[type="password"]').fill(process.env.GUIDA_PASSWORD ?? "");
await admin.getByRole("button", { name: /Accedi/i }).click();
await admin.waitForURL(/dashboard/, { timeout: 30_000 });
await admin.waitForTimeout(2500);

async function scattaAdmin(nome, didascalia) {
  n += 1;
  const file = `${USCITA}/${String(n).padStart(2, "0")}-${nome}.png`;
  await admin.screenshot({ path: file });
  console.log(`  ${file}  — ${didascalia}`);
  passi.push({ file, didascalia, larghezza: 2560, altezza: 1800 });
}

await scattaAdmin("sala", "In sala ogni tavolo ha un colore: chi aspetta, chi deve pagare, chi può alzarsi");

await admin.goto(`${ADMIN}/dashboard/orders`, { waitUntil: "networkidle" });
await admin.waitForTimeout(2000);
await scattaAdmin("cucina", "In cucina la comanda arriva già scritta: niente fogli, niente voce");

await admin.goto(`${ADMIN}/dashboard/analisi`, { waitUntil: "networkidle" });
await admin.waitForTimeout(2500);
await scattaAdmin("analisi", "A fine servizio i conti tornano da soli: coperti, scontrino medio, rotazione");

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
      larghezza: p.larghezza,
      altezza: p.altezza,
    })),
    null,
    2
  ) + "\n"
);
console.log("Didascalie scritte in guida/src/passi.json");
