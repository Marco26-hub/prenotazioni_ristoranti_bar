import postgres from "postgres";

// Connessione Postgres condivisa — funziona identica su Neon o Supabase:
// entrambi espongono una connection string Postgres standard, e qui non
// c'è nessun SDK proprietario (né @supabase/supabase-js né
// @neondatabase/serverless), solo query SQL dirette via postgres.js.
// Per cambiare provider basta cambiare DATABASE_URL, zero modifiche al codice.
//
// `prepare: false` perché sia il pooler Supabase (pgbouncer, porta 6543)
// che il pooler Neon (anch'esso pgbouncer-based) girano in transaction
// mode, che non supporta prepared statement persistenti. Costo: query
// leggermente più lente. Se in futuro si usa solo connessione diretta
// (porta 5432, no pooler) si può rimuovere per guadagnare velocità.
//
// Server-only per costruzione: usata solo da Route Handlers/Server
// Components, mai da codice che finisce nel bundle browser.
let cached: ReturnType<typeof postgres> | null = null;

export function db() {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL mancante");
  cached = postgres(url, { ssl: "require", prepare: false });
  return cached;
}
