import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";

/**
 * Stato dei numeri di ritiro di questo tavolo.
 *
 * Serve al metodo "telefono": chi ha ordinato dal QR ha già la pagina
 * aperta, e il numero con il suo stato è la cosa che sta aspettando. Gli
 * altri due metodi — segnaposto e cercapersone — non passano di qui: li
 * gestisce chi sta al banco.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId mancante" }, { status: 400 });
  }

  // Interrogato ogni pochi secondi da chi aspetta: il limite è alto perché
  // un tavolo che guarda il proprio numero non è un abuso.
  const { allowed } = await checkRateLimit(clientKey(request, "ritiro"), 120, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }

  const sql = db();

  /*
   * "Pronto" si deduce dalle righe, non da una colonna a parte.
   *
   * Lo stato vero lo muove la cucina riga per riga, ed è quello che il
   * cliente deve vedere: una seconda colonna da tenere allineata a mano
   * sarebbe una seconda verità, cioè prima o poi una verità sbagliata.
   */
  const ordini = await sql<
    {
      numero: number | null;
      chiamato: Date | null;
      ritirato: Date | null;
      pronte: number;
      totali: number;
    }[]
  >`
    select o.pickup_number as numero,
           o.pickup_chiamato_at as chiamato,
           o.pickup_ritirato_at as ritirato,
           count(*) filter (
             where oi.status in ('ready', 'served')
           )::int as pronte,
           count(*)::int as totali
      from orders o
      join order_items oi on oi.order_id = o.id
     where o.table_session_id = ${sessionId}
       and o.pickup_number is not null
       and o.status <> 'cancelled'
       and oi.status <> 'cancelled'
     group by o.id, o.pickup_number, o.pickup_chiamato_at, o.pickup_ritirato_at
     order by o.pickup_number`;

  return NextResponse.json({
    ordini: ordini.map((o) => ({
      numero: o.numero,
      stato: o.ritirato
        ? "ritirato"
        : o.chiamato || (o.totali > 0 && o.pronte === o.totali)
          ? "pronto"
          : "in_preparazione",
    })),
  });
}
