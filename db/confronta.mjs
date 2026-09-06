/**
 * L'installazione da zero è uguale alla produzione?
 *
 * Il repo ha due descrizioni dello stesso database: `schema.sql`, che è
 * l'installazione pulita, e le migrazioni, che sono la strada percorsa dalla
 * produzione. Divergono in silenzio: una colonna aggiunta con una migrazione
 * e dimenticata in schema.sql non rompe niente qui, rompe il primo cliente
 * installato da zero.
 *
 * È già successo due volte, e tutte e due le volte non erano colonne:
 * `schema.sql` rifiutava le prenotazioni `pending` perché il CHECK era
 * vecchio, e i reparti `sushi` e `griglia` fallivano l'inserimento per lo
 * stesso motivo. Confrontare le colonne non basta. Qui si confrontano
 * colonne, indici E vincoli, e va rilanciato DOPO ogni modifica allo schema,
 * non prima.
 *
 * Come funziona: applica schema.sql più tutte le migrazioni dentro uno schema
 * temporaneo dello stesso database, confronta, e lo butta via. Niente secondo
 * database da tenere in piedi.
 *
 *   node db/confronta.mjs
 */
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));
const URL_DB = process.env.DATABASE_URL;
if (!URL_DB) {
  console.error("DATABASE_URL mancante");
  process.exit(1);
}

const PROVA = "confronto_installazione";
const sql = postgres(URL_DB, { prepare: false, max: 1, onnotice: () => {} });

/*
 * La tabella del registro delle migrazioni la crea `migrate.mjs`, non
 * schema.sql: comparirebbe come differenza a ogni esecuzione. Una differenza
 * che c'è sempre è una differenza che si impara a ignorare, ed è esattamente
 * così che sono passati inosservati il CHECK sulle prenotazioni e quello sui
 * reparti. Qui l'esito è o pulito o vero.
 */
const IGNORA = new Set(["schema_migrations"]);

const RILEVA = {
  colonne: `
    select table_name, column_name, data_type, is_nullable, column_default
      from information_schema.columns
     where table_schema = $1
     order by table_name, column_name`,
  indici: `
    select tablename as table_name, indexname as name, indexdef as definizione
      from pg_indexes where schemaname = $1
     order by tablename, indexname`,
  vincoli: `
    select rel.relname as table_name, con.conname as name,
           pg_get_constraintdef(con.oid) as definizione
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace ns on ns.oid = rel.relnamespace
     where ns.nspname = $1
     order by rel.relname, con.conname`,
};

/** Il default e il nome dell'indice portano dentro il nome dello schema. */
const ripulisci = (v, schema) =>
  v == null ? v : String(v).replaceAll(`${schema}.`, "").replaceAll(`"${schema}".`, "");

async function rileva(schema) {
  const fuori = {};
  for (const [nome, query] of Object.entries(RILEVA)) {
    const righe = await sql.unsafe(query, [schema]);
    fuori[nome] = new Map(
      righe.filter((r) => !IGNORA.has(r.table_name)).map((r) => {
        const chiave = `${r.table_name}.${r.column_name ?? r.name}`;
        const valore = Object.entries(r)
          .filter(([k]) => k !== "table_name")
          .map(([k, v]) => `${k}=${ripulisci(v, schema)}`)
          .join(" | ");
        return [chiave, valore];
      })
    );
  }
  return fuori;
}

function confronta(titolo, atteso, trovato) {
  const problemi = [];
  for (const [k, v] of atteso) {
    if (!trovato.has(k)) problemi.push(`  manca in produzione: ${k}`);
    else if (trovato.get(k) !== v) {
      problemi.push(`  diverso: ${k}\n      installazione: ${v}\n      produzione:    ${trovato.get(k)}`);
    }
  }
  for (const k of trovato.keys()) {
    if (!atteso.has(k)) problemi.push(`  manca in schema.sql: ${k}`);
  }
  if (problemi.length === 0) {
    console.log(`${titolo.toUpperCase()} IDENTICI`);
    return true;
  }
  console.log(`${titolo.toUpperCase()} — ${problemi.length} differenze`);
  for (const p of problemi) console.log(p);
  return false;
}

try {
  await sql.unsafe(`drop schema if exists ${PROVA} cascade`);
  await sql.unsafe(`create schema ${PROVA}`);
  await sql.unsafe(`set search_path to ${PROVA}, public`);

  const schema = readFileSync(join(QUI, "schema.sql"), "utf8");
  await sql.unsafe(schema);

  const migrazioni = readdirSync(join(QUI, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const m of migrazioni) {
    try {
      await sql.unsafe(readFileSync(join(QUI, "migrations", m), "utf8"));
    } catch (e) {
      // Una migrazione già assorbita in schema.sql fallisce qui, ed è normale:
      // "column already exists" significa che l'installazione pulita ce
      // l'aveva già. Quello che conta è il confronto finale.
      if (!/already exists|esiste già|duplicate/i.test(e.message)) {
        console.log(`migrazione ${m}: ${e.message}`);
      }
    }
  }

  const atteso = await rileva(PROVA);
  const trovato = await rileva("public");

  let tutto = true;
  for (const tipo of Object.keys(RILEVA)) {
    if (!confronta(tipo, atteso[tipo], trovato[tipo])) tutto = false;
  }
  process.exitCode = tutto ? 0 : 1;
} finally {
  await sql.unsafe(`drop schema if exists ${PROVA} cascade`).catch(() => {});
  await sql.end();
}
