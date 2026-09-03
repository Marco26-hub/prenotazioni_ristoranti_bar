#!/usr/bin/env node
/**
 * Runner di migrazioni minimale: applica in ordine i file .sql in
 * db/migrations che non risultano già eseguiti, dentro una transazione
 * ciascuno, e ne registra il nome in schema_migrations.
 *
 * Volutamente senza dipendenze e senza rollback automatico: le migrazioni
 * vanno scritte in modo additivo (add column, create index if not exists),
 * così un deploy che va male non lascia il database a metà.
 *
 * Uso: DATABASE_URL=... node db/migrate.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const dir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL mancante");
  process.exit(1);
}

// I NOTICE di Postgres ("relation already exists, skipping") sono attesi con
// le CREATE ... IF NOT EXISTS e renderebbero illeggibile l'output.
/*
 * TLS obbligatorio, tranne su localhost.
 *
 * Il pooler di produzione lo esige, ma imponendolo sempre non si poteva
 * applicare le migrazioni a un Postgres locale — cioe' proprio la prova che
 * serve prima di rilasciare: verificare che partendo da zero le migrazioni
 * e schema.sql producano lo stesso database. Senza poterla fare, una
 * divergenza si scopre alla prima installazione vera.
 */
const locale = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
const sql = postgres(url, {
  ssl: locale ? false : "require",
  prepare: false,
  onnotice: () => {},
});

try {
  await sql`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`;

  const applied = new Set(
    (await sql`select name from schema_migrations`).map((r) => r.name)
  );

  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  let count = 0;

  for (const file of files) {
    if (applied.has(file)) continue;

    const content = await readFile(join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into schema_migrations (name) values (${file})`;
    });

    console.log(`applicata: ${file}`);
    count++;
  }

  console.log(count === 0 ? "nessuna migrazione da applicare" : `${count} migrazioni applicate`);
} catch (err) {
  console.error("migrazione fallita:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
