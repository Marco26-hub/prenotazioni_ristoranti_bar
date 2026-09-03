/**
 * Cattura i fotogrammi della guida: ogni pagina, dall'onboarding del
 * personale alla fattura.
 *
 * Sono schermate vere della produzione, non mockup: una guida disegnata a
 * mano invecchia al primo ritocco dell'interfaccia e finisce per insegnare
 * qualcosa che non esiste più. Qui basta rilanciare lo script.
 *
 *   GUIDA_EMAIL=… GUIDA_PASSWORD=… node guida/cattura.mjs
 *
 * Il tavolo di lavoro viene ripulito prima e dopo, così la guida si rifà
 * quante volte serve senza lasciare sessioni aperte in sala.
 */

import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  select t.id, t.code, t.qr_token from tables t
    join venues v on v.id = t.venue_id
   where v.slug = ${SLUG} and t.code = ${TAVOLO}`;
if (!tavolo) {
  console.error(`Tavolo ${TAVOLO} non trovato`);
  process.exit(1);
}

async function pulisci() {
  const s = await sql`
    select id from table_sessions where table_id = ${tavolo.id} and status = 'open'`;
  for (const x of s) {
    await sql`delete from table_calls where table_session_id = ${x.id}`;
    await sql`delete from order_items where order_id in (
                select id from orders where table_session_id = ${x.id})`;
    await sql`delete from orders where table_session_id = ${x.id}`;
    await sql`delete from payments where table_session_id = ${x.id}`;
    await sql`delete from table_sessions where id = ${x.id}`;
  }
  return s.length;
}

mkdirSync(USCITA, { recursive: true });
console.log(`Pulite ${await pulisci()} sessioni precedenti su ${tavolo.code}`);

const browser = await chromium.launch();

const telefono = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "it-IT",
});
const cliente = await telefono.newPage();

const scrivania = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1.5,
  locale: "it-IT",
});
const admin = await scrivania.newPage();

await admin.goto(`${ADMIN}/login`, { waitUntil: "networkidle" });
await admin.locator('input[type="email"]').fill(process.env.GUIDA_EMAIL ?? "");
await admin.locator('input[type="password"]').fill(process.env.GUIDA_PASSWORD ?? "");
await admin.getByRole("button", { name: /Accedi/i }).click();

// Non si aspetta l'URL: l'host si chiama ristoranti-dashboard, quindi una
// regex su "dashboard" combacia già stando sul login e il resto della
// cattura fotografa venti volte la stessa maschera di accesso. Si aspetta
// invece qualcosa che esiste solo da dentro.
await admin.getByRole("button", { name: /^Esci$/i }).waitFor({
  state: "visible",
  timeout: 30_000,
});

const passi = [];
let n = 0;

async function scatta(pagina, capitolo, nome, titolo, dettaglio, intera = false) {
  n += 1;
  const file = `${USCITA}/${String(n).padStart(2, "0")}-${nome}.jpg`;
  // JPEG e non PNG: le schermate finiscono dentro una pagina HTML, e un PNG
  // da 400 KB per venti immagini la renderebbe impossibile da aprire.
  await pagina.screenshot({ path: file, type: "jpeg", quality: 78, fullPage: intera });
  console.log(`  ${String(n).padStart(2, "0")}  [${capitolo}] ${titolo}`);
  passi.push({
    immagine: file.replace("guida/public/", ""),
    capitolo,
    titolo,
    dettaglio,
    telefono: pagina === cliente,
  });
}

const vai = async (p, url, ms = 2200) => {
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(ms);
};

/* --- 1. Si parte: il locale si attrezza ------------------------------ */
const C1 = "Preparare il locale";

await vai(admin, `${ADMIN}/dashboard/staff`);
await scatta(admin, C1, "personale", "Chi lavora e cosa può fare",
  "Ruolo, tavoli assegnati, reparti su cui può agire e un codice operatore per entrare in fretta dal tablet condiviso. Qui si vedono anche gli schermi accesi in questo momento.");

await vai(admin, `${ADMIN}/dashboard/menu`);
await scatta(admin, C1, "menu-admin", "Il menu, con quello che la legge richiede",
  "Allergeni a caselle secondo l'Allegato II, ingredienti, conservazione. Il gestionale conta da solo i piatti ancora scoperti e te lo dice in cima.");

await vai(admin, `${ADMIN}/dashboard/tables`);
await scatta(admin, C1, "qr", "I QR dei tavoli, pronti per la tipografia",
  "Un PDF con tutti i cavalierini, A6 con 3 mm di abbondanza e crocini di taglio: è il file da mandare allo stampatore.");

await vai(admin, `${ADMIN}/dashboard/settings`);
await scatta(admin, C1, "impostazioni", "Marchio, tempi, testi e pagamenti",
  "Logo e colori, dopo quanti minuti una comanda è in ritardo, le frasi che il cliente legge, coperto e servizio, Stripe e Satispay.");

/* --- 2. Il cliente ordina -------------------------------------------- */
const C2 = "Il cliente ordina";

await vai(cliente, `${GUEST}/v/${SLUG}/t/${tavolo.qr_token}`);
await scatta(cliente, C2, "menu", "Inquadra il QR sul tavolo",
  "Si apre il menu del locale. Nessuna app da scaricare, nessun account da creare, nessuna attesa.");

await cliente.getByRole("button", { name: /^Dettagli di/i }).first().click();
await cliente.waitForTimeout(900);
await scatta(cliente, C2, "scheda", "Tocca un piatto e sa cosa contiene",
  "Ingredienti, allergeni e conservazione: quello che il Reg. UE 1169/2011 impone e che su una carta stampata non ci starebbe mai.");
await cliente.keyboard.press("Escape").catch(() => {});
await cliente.waitForTimeout(500);

const piu = cliente.getByRole("button", { name: /^Aggiungi / });
await piu.nth(1).click();
await cliente.waitForTimeout(400);
await piu.nth(3).click();
await cliente.waitForTimeout(900);
await scatta(cliente, C2, "carrello", "Aggiunge con +, il totale si aggiorna",
  "Cambia le quantità e lascia una nota per la cucina: senza cipolla, senza glutine, cottura al sangue.");

await cliente.getByRole("button", { name: /^Ordina/ }).click();
await cliente.waitForTimeout(3000);
await scatta(cliente, C2, "inviato", "Ordina, e la comanda parte subito",
  "Arriva in cucina già scritta. Nessuno deve venire a prenderla e nessuno la ricopia a mano.");

/* --- 3. Il locale lavora --------------------------------------------- */
const C3 = "Il servizio";

await vai(admin, `${ADMIN}/dashboard/orders`, 3000);
await scatta(admin, C3, "cucina", "In cucina niente fogli e niente voce",
  "Un tocco manda avanti il piatto, un altro lo trattiene se il tavolo è ancora sugli antipasti. Ogni riga porta il nome di chi l'ha mossa.");

await vai(admin, `${ADMIN}/dashboard`, 3000);
await scatta(admin, C3, "sala", "La sala si legge a colpo d'occhio",
  "Un colore per stato: chi aspetta da troppo, chi ha i piatti al passe, chi ha pagato solo in parte, chi può alzarsi. La pianta si dispone trascinando i tavoli.");

await vai(admin, `${ADMIN}/dashboard/orders/storico`, 2500);
await scatta(admin, C3, "storico", "Lo storico della giornata",
  "Ordinato, incassato e ogni tavolo con le sue righe. Ordinato e incassato non coincidono quando un conto è in contanti o ancora aperto, e la pagina lo dice.");

/* --- 4. Pagamento e documenti ---------------------------------------- */
const C4 = "Pagare e chiudere";

await cliente.getByRole("link", { name: /Paga ora/i }).first().click();
const contanti = cliente.getByRole("button", { name: /Pago in contanti/i });
await contanti.first().waitFor({ state: "visible", timeout: 20_000 });
await contanti.first().scrollIntoViewIfNeeded();
await cliente.waitForTimeout(900);
await scatta(cliente, C4, "conto", "Il conto è sempre aggiornato",
  "Si paga quando si vuole, tutto insieme o alla romana, senza aspettare che passi il cameriere.");

await contanti.first().click();
await cliente.waitForTimeout(900);
await scatta(cliente, C4, "contanti", "Paga in contanti? Sceglie il documento",
  "Scontrino o fattura. Il contante non passa da nessun circuito: qui il software può solo far arrivare qualcuno al tavolo con il documento giusto.");

await cliente.getByRole("button", { name: /Chiama il cameriere/i }).click();
await cliente.waitForTimeout(2500);
await scatta(cliente, C4, "chiamato", "La chiamata è partita",
  "In sala compare in rosso, con il numero del tavolo e cosa portare. Premere più volte non accumula richieste.");

await vai(admin, `${ADMIN}/dashboard/invoices`, 2500);
await scatta(admin, C4, "fatture", "La fattura elettronica",
  "Chi la chiede dal tavolo lascia i suoi dati e il documento va allo SDI, con lo stato di consegna sempre visibile.");

/* --- 5. Prenotazioni -------------------------------------------------- */
const C5 = "Prenotazioni";

await vai(cliente, `${GUEST}/p/${SLUG}`, 2500);
await scatta(cliente, C5, "prenota-pubblica", "La pagina che metti sul tuo sito",
  "Calendario, capienza reale e conferma. Funziona anche da sola, senza il gestionale di sala.");

await vai(admin, `${ADMIN}/dashboard/reservations`, 2500);
await scatta(admin, C5, "prenotazioni", "Il calendario del ristoratore",
  "Richieste da confermare in evidenza, coperti per giorno, conferma o rifiuto con gli orari alternativi calcolati sulle prenotazioni già prese.");

/* --- 6. I conti ------------------------------------------------------- */
const C6 = "Capire come va";

await vai(admin, `${ADMIN}/dashboard/analisi`, 3000);
await scatta(admin, C6, "analisi", "A fine servizio i conti tornano da soli",
  "Coperti, spesa media, permanenza al tavolo, rotazione, cosa vende davvero e come pagano. Con la stampa in PDF per il commercialista.");

await vai(admin, `${ADMIN}/dashboard/billing`, 2500);
await scatta(admin, C6, "abbonamento", "L'abbonamento",
  "Ordini, solo prenotazioni o tutto insieme, mensile o annuale. Nessuna percentuale trattenuta sugli incassi del locale.");

await vai(cliente, `${GUEST}/m/${SLUG}`, 2500);
await scatta(cliente, C6, "menu-pubblico", "Il menu pubblico, da mettere ovunque",
  "Lo stesso menu senza ordinazione, per il sito, i social e Google. Con allergeni, orari e contatti.");

await browser.close();
console.log(`\n${passi.length} fotogrammi in ${USCITA}`);
console.log(`Ripulite ${await pulisci()} sessioni di lavoro`);
await sql.end();

writeFileSync("guida/src/passi.json", JSON.stringify(passi, null, 2) + "\n");
console.log("Manifest scritto in guida/src/passi.json");
