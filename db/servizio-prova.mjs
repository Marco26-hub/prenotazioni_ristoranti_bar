/**
 * Servizio di prova: popola la sala come una sera vera, per guardare la
 * dashboard con dati addosso invece che vuota.
 *
 *   node db/servizio-prova.mjs            crea il servizio
 *   node db/servizio-prova.mjs --pulisci  cancella solo ciò che ha creato
 *
 * Tutto quello che scrive è marcato: le sessioni hanno guest_count normale ma
 * gli ordini portano una nota riconoscibile, e le prenotazioni un indirizzo
 * @prova.local. La pulizia si basa su quei segni, così non tocca mai un
 * ordine o una prenotazione veri.
 */

import postgres from "postgres";
import { readFileSync } from "node:fs";

const MARCA = "[prova]";
const DOMINIO = "@prova.local";
const SLUG = process.env.VENUE_SLUG ?? "trattoria-da-luca";

for (const riga of readFileSync("apps/dashboard/.env.local", "utf8").split("\n")) {
  const m = riga.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });

const [venue] = await sql`select id, name from venues where slug = ${SLUG}`;
if (!venue) {
  console.error(`Locale ${SLUG} non trovato`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Pulizia                                                             */
/* ------------------------------------------------------------------ */

async function pulisci() {
  // Aperte e chiuse: lo storico creato per le analisi va via con il resto.
  const sessioni = await sql`
    select distinct ts.id
      from table_sessions ts
      join orders o on o.table_session_id = ts.id
     where ts.venue_id = ${venue.id} and o.notes like ${MARCA + "%"}`;

  const ids = sessioni.map((s) => s.id);

  if (ids.length > 0) {
    await sql`delete from order_items where order_id in (
                select id from orders where table_session_id in ${sql(ids)})`;
    await sql`delete from orders where table_session_id in ${sql(ids)}`;
    await sql`delete from payments where table_session_id in ${sql(ids)}`;
    await sql`delete from table_sessions where id in ${sql(ids)}`;
  }

  const pren = await sql`
    delete from reservations
     where venue_id = ${venue.id} and customer_email like ${"%" + DOMINIO}
    returning id`;

  console.log(`Ripulito: ${ids.length} tavoli, ${pren.length} prenotazioni.`);
  await sql.end();
  process.exit(0);
}

if (process.argv.includes("--pulisci")) await pulisci();

/* ------------------------------------------------------------------ */
/* Creazione                                                           */
/* ------------------------------------------------------------------ */

const tavoli = await sql`
  select id, code, seats from tables
   where venue_id = ${venue.id} and active = true order by code`;

const piatti = await sql`
  select mi.id, mi.name, mi.price_cents, mc.name as categoria
    from menu_items mi
    left join menu_categories mc on mc.id = mi.category_id
   where mi.venue_id = ${venue.id} and mi.available = true
   order by mc.sort_order, mi.sort_order`;

if (tavoli.length < 4 || piatti.length < 5) {
  console.error("Servono almeno 4 tavoli e 5 piatti a menu.");
  process.exit(1);
}

const cerca = (frammento) =>
  piatti.find((p) => p.name.toLowerCase().includes(frammento.toLowerCase())) ?? piatti[0];

const min = (n) => new Date(Date.now() - n * 60_000);

/**
 * Cinque tavoli in cinque momenti diversi del servizio: è la situazione che
 * il titolare deve saper leggere in tre secondi guardando la sala.
 */
const SCENA = [
  {
    // Appena seduti: hanno ordinato, la cucina non ha ancora preso in carico.
    coperti: 2,
    apertoDaMin: 8,
    note: "appena ordinato",
    righe: [
      ["Crudo di gambero", 1, "pending"],
      ["Cacio e pepe", 2, "pending"],
      ["Vermentino", 1, "sent_to_kitchen"],
    ],
    pagato: 0,
  },
  {
    // In cucina: il caso più comune a metà servizio.
    coperti: 4,
    apertoDaMin: 25,
    note: "primi in preparazione",
    righe: [
      ["Carciofo", 2, "served"],
      ["Burrata", 1, "served"],
      ["Amatriciana", 2, "preparing"],
      ["Risotto", 1, "preparing"],
      ["Cesanese", 1, "served"],
    ],
    pagato: 0,
  },
  {
    // Roba pronta al passe che nessuno ha ancora portato: è l'allarme vero.
    coperti: 3,
    apertoDaMin: 41,
    note: "pronto al passe da qualche minuto",
    righe: [
      ["Tagliata", 1, "ready"],
      ["Baccalà", 2, "ready"],
      ["Barbera", 1, "served"],
      ["Acqua", 3, "served"],
    ],
    pagato: 0,
  },
  {
    // Pagamento alla romana già iniziato: due hanno pagato, uno no.
    coperti: 4,
    apertoDaMin: 72,
    note: "alla romana, due quote incassate",
    righe: [
      ["Amatriciana", 2, "served"],
      ["Tagliata", 2, "served"],
      ["Tiramisù", 3, "served"],
      ["Caffè", 4, "served"],
      ["Barbera", 2, "served"],
    ],
    pagato: "meta",
  },
  {
    // Conto saldato ma tavolo non ancora liberato.
    coperti: 2,
    apertoDaMin: 95,
    note: "conto saldato, tavolo da sparecchiare",
    righe: [
      ["Burrata", 1, "served"],
      ["Risotto", 2, "served"],
      ["Sorbetto", 2, "served"],
      ["Vermentino", 1, "served"],
    ],
    pagato: "tutto",
  },
];

let creati = 0;

for (let i = 0; i < Math.min(SCENA.length, tavoli.length); i++) {
  const t = tavoli[i];
  const s = SCENA[i];

  // Un tavolo già aperto per altri motivi non va disturbato.
  const [occupato] = await sql`
    select id from table_sessions where table_id = ${t.id} and status = 'open'`;
  if (occupato) {
    console.log(`  ${t.code} già aperto, salto`);
    continue;
  }

  const [sessione] = await sql`
    insert into table_sessions (table_id, venue_id, status, guest_count, opened_at)
    values (${t.id}, ${venue.id}, 'open', ${s.coperti}, ${min(s.apertoDaMin)})
    returning id`;

  const [ordine] = await sql`
    insert into orders (venue_id, table_session_id, status, notes, created_at)
    values (${venue.id}, ${sessione.id}, 'confirmed',
            ${`${MARCA} ${s.note}`}, ${min(s.apertoDaMin - 3)})
    returning id`;

  let totale = 0;
  for (const [frammento, qta, stato] of s.righe) {
    const p = cerca(frammento);
    totale += p.price_cents * qta;
    await sql`
      insert into order_items (order_id, menu_item_id, quantity, unit_price_cents, status)
      values (${ordine.id}, ${p.id}, ${qta}, ${p.price_cents}, ${stato})`;
  }

  if (s.pagato === "tutto" || s.pagato === "meta") {
    const quota = s.pagato === "tutto" ? totale : Math.round(totale / 2);
    await sql`
      insert into payments (venue_id, table_session_id, amount_cents, method,
                            provider, split_type, status, paid_by_label, created_at)
      values (${venue.id}, ${sessione.id}, ${quota}, 'card', 'stripe',
              ${s.pagato === "tutto" ? "full" : "per_person"}, 'succeeded',
              ${s.pagato === "tutto" ? null : "Quota 1-2"}, ${min(4)})`;
  }

  creati++;
  console.log(
    `  ${t.code}: ${s.coperti} coperti · ${(totale / 100).toFixed(2)} € · ${s.note}`
  );
}

/* --- Servizi già chiusi, per le analisi ------------------------------ */

/**
 * Le analisi misurano i servizi chiusi: permanenza, spesa per coperto e
 * rotazione non esistono finché il tavolo è aperto. Senza uno storico la
 * pagina resta muta, e sotto i venti tavoli chiusi si rifiuta pure di
 * disegnare la fascia oraria — giustamente, perché mostrerebbe il caso.
 */
const ORE_SERVIZIO = [12, 12, 13, 13, 13, 14, 19, 19, 20, 20, 20, 21, 21, 22];

let chiusi = 0;
for (let giorno = 1; giorno <= 7; giorno++) {
  // Il fine settimana pesa di più: un locale che lavora uguale tutti i
  // giorni non esiste, e i grafici piatti non insegnano niente.
  const data = new Date();
  data.setDate(data.getDate() - giorno);
  const feriale = data.getDay() >= 1 && data.getDay() <= 4;
  const quanti = feriale ? 3 : 6;

  for (let n = 0; n < quanti; n++) {
    const t = tavoli[(giorno * 3 + n) % tavoli.length];
    const ora = ORE_SERVIZIO[(giorno * 5 + n * 3) % ORE_SERVIZIO.length];
    const coperti = 2 + ((giorno + n) % 4);
    const durata = 55 + ((giorno * 7 + n * 11) % 70);

    const apertura = new Date(data);
    apertura.setHours(ora, (n * 17) % 60, 0, 0);
    const chiusura = new Date(apertura.getTime() + durata * 60_000);

    const [ses] = await sql`
      insert into table_sessions (table_id, venue_id, status, guest_count,
                                  opened_at, closed_at)
      values (${t.id}, ${venue.id}, 'closed', ${coperti}, ${apertura}, ${chiusura})
      returning id`;

    const [ord] = await sql`
      insert into orders (venue_id, table_session_id, status, notes, created_at)
      values (${venue.id}, ${ses.id}, 'served', ${`${MARCA} servizio chiuso`}, ${apertura})
      returning id`;

    // Da uno a tre piatti a testa, presi dal menu vero: così "cosa vende"
    // mostra una classifica plausibile invece di sempre lo stesso piatto.
    let totale = 0;
    const quantiPiatti = coperti + ((giorno + n) % 3);
    for (let k = 0; k < quantiPiatti; k++) {
      const p = piatti[(giorno * 13 + n * 7 + k * 3) % piatti.length];
      totale += p.price_cents;
      await sql`
        insert into order_items (order_id, menu_item_id, quantity,
                                 unit_price_cents, status)
        values (${ord.id}, ${p.id}, 1, ${p.price_cents}, 'served')`;
    }

    const metodo = ["card", "card", "card", "satispay", "cash"][(giorno + n) % 5];
    await sql`
      insert into payments (venue_id, table_session_id, amount_cents, method,
                            provider, split_type, status, created_at)
      values (${venue.id}, ${ses.id}, ${totale}, ${metodo},
              ${metodo === "cash" ? "manual" : metodo === "satispay" ? "satispay" : "stripe"},
              'full', 'succeeded', ${chiusura})`;

    chiusi++;
  }
}

console.log(`  ${chiusi} servizi chiusi negli ultimi 7 giorni`);

/* --- Prenotazioni della serata ------------------------------------- */

const oggi = new Date();
const alle = (h, m) =>
  new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), h, m, 0, 0);

const PRENOTAZIONI = [
  ["Famiglia Ricci", 4, alle(19, 30), "confirmed", "Seggiolone per bambino"],
  ["Bianchi", 2, alle(20, 0), "confirmed", null],
  ["Cena di lavoro Moretti", 6, alle(20, 30), "pending", "Tavolo tranquillo, fattura"],
  ["De Santis", 2, alle(21, 0), "pending", "Una celiaca"],
  ["Ferrari", 8, alle(21, 30), "confirmed", "Compleanno, portiamo la torta"],
  ["Greco", 3, alle(20, 15), "cancelled", null],
];

let pren = 0;
for (const [nome, coperti, quando, stato, note] of PRENOTAZIONI) {
  const email = nome.toLowerCase().replace(/[^a-z]+/g, ".") + DOMINIO;
  await sql`
    insert into reservations (venue_id, customer_name, customer_email, customer_phone,
                              party_size, reserved_at, status, notes)
    values (${venue.id}, ${nome}, ${email}, '+39 340 0000000',
            ${coperti}, ${quando}, ${stato}, ${note})`;
  pren++;
}

console.log(`\n${creati} tavoli aperti, ${pren} prenotazioni per stasera.`);
console.log("Per rimuovere tutto: node db/servizio-prova.mjs --pulisci");

await sql.end();
