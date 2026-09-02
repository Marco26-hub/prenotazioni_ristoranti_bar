import "server-only";
import { db } from "./db";

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

  // Pulizia opportunistica: le righe scadute non servono più e senza questo
  // la tabella cresce all'infinito. Farlo su una richiesta su cento evita sia
  // un job schedulato (che in serverless andrebbe ospitato da qualche parte)
  // sia una DELETE su ogni singola chiamata.
  if (Math.random() < 0.01) {
    await sql`delete from rate_limits where window_start < now() - interval '1 day'`;
  }

  return { allowed: row.count <= limit, count: row.count };
}

/** IP del chiamante da header proxy (Vercel/Next lo popola in produzione). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
