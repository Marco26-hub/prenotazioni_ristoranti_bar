import "server-only";
import { createHmac } from "node:crypto";
import { db } from "./db";

/**
 * Quanto a lungo può restare una riga di rate limit.
 *
 * La finestra più lunga in uso è di un'ora: oltre le due ore una riga non
 * serve più a nulla e resta solo un dato di traffico da conservare.
 */
const RETENTION_HOURS = 2;

/**
 * Rate limit DB-backed a finestra fissa. Un solo UPDATE atomico (upsert):
 * se la finestra è scaduta la resetta, altrimenti incrementa — nessuna
 * race condition tra letture e scritture separate, funziona anche con
 * più istanze serverless che non condividono memoria.
 */
export async function checkRateLimit(
  bucketKey: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; count: number }> {
  const sql = db();

  const [row] = await sql<{ count: number }[]>`
    insert into rate_limits (bucket_key, window_start, count)
    values (${bucketKey}, now(), 1)
    on conflict (bucket_key) do update set
      count = case
        when rate_limits.window_start < now() - (${windowSeconds} || ' seconds')::interval
          then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when rate_limits.window_start < now() - (${windowSeconds} || ' seconds')::interval
          then now()
        else rate_limits.window_start
      end
    returning count`;

  // Pulizia opportunistica: evita sia un job schedulato (che in serverless
  // andrebbe ospitato da qualche parte) sia una DELETE su ogni chiamata. La
  // probabilità è alta abbastanza da tenere corta la conservazione anche su
  // un locale con poco traffico.
  if (Math.random() < 0.05) {
    await sql`delete from rate_limits
      where window_start < now() - (${RETENTION_HOURS} || ' hours')::interval`;
  }

  return { allowed: row.count <= limit, count: row.count };
}

/** IP del chiamante da header proxy (Vercel/Next lo popola in produzione). */
function rawIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Chiave di rate limit per chiamante, con l'IP pseudonimizzato.
 *
 * L'IP è un dato personale: scriverlo in chiaro nella tabella significava
 * tenere un registro del traffico di ogni cliente seduto al tavolo, per una
 * finalità — impedire gli abusi — che non ha bisogno di sapere chi sia.
 *
 * L'HMAC serve al posto di un hash semplice perché lo spazio degli IPv4 è
 * piccolo: un SHA senza chiave si inverte provando i quattro miliardi di
 * valori possibili, e non sarebbe pseudonimizzazione ma solo apparenza.
 *
 * Il prefisso resta in chiaro: distingue i contatori senza dire nulla su
 * chi li ha generati.
 */
export function clientKey(request: Request, prefix: string): string {
  return `${prefix}:${pseudonymise(rawIp(request))}`;
}

/** Come `clientKey`, per i punti in cui l'IP è già stato estratto altrove. */
export function pseudonymise(value: string): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    // Senza chiave il valore sarebbe reversibile: meglio non distinguere i
    // chiamanti — il limite diventa globale, restrittivo ma non indiscreto.
    console.error("[rate-limit] ENCRYPTION_KEY mancante: rate limit non per chiamante");
    return "no-key";
  }
  return createHmac("sha256", `${secret}:rate-limit`).update(value).digest("hex").slice(0, 32);
}
