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

  return { allowed: row.count <= limit, count: row.count };
}

/** IP del chiamante da header proxy (Vercel/Next lo popola in produzione). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
