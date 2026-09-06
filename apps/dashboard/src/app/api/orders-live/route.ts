import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@repo/shared/db";

export async function GET() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue || !session?.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const userId = session.user.id;

  const sql = db();
  const rows = await sql<
    {
      id: string;
      table_code: string;
      /**
       * L'ondata a cui la riga appartiene.
       *
       * La sessione di un all you can eat dura tutto il turno e contiene
       * cinque ordini: senza sapere di quale ordine è la riga, la board può
       * misurare solo l'attesa dell'intera sessione.
       */
      order_id: string;
      pickup_number: number | null;
      item_name: string;
      quantity: number;
      status: string;
      notes: string | null;
      created_at: string;
      selected_options: Array<{ opzione: string }>;
      held_at: Date | null;
      reparto: string;
      mio_tavolo: boolean;
      ultimo_da: string | null;
    }[]
  >`
    select oi.id, t.code as table_code, oi.order_id, o.pickup_number, mi.name as item_name, oi.quantity, oi.status,
           oi.notes, o.created_at, oi.selected_options, oi.held_at,
           coalesce(mc.reparto, 'cucina') as reparto,
           (t.assigned_to = ${userId}) as mio_tavolo,
           (select e.user_label from order_item_events e
             where e.order_item_id = oi.id and e.azione = 'stato'
             order by e.created_at desc limit 1) as ultimo_da
    from order_items oi
    join orders o on o.id = oi.order_id
    join table_sessions ts on ts.id = o.table_session_id
    join tables t on t.id = ts.table_id
    join menu_items mi on mi.id = oi.menu_item_id
    left join menu_categories mc on mc.id = mi.category_id
    -- I serviti restano: sparendo, chi è al tavolo perde il quadro di cosa
    -- ha già ricevuto. Il limite è la sessione aperta, così la lista non
    -- cresce all'infinito.
    where o.venue_id = ${venue.venueId}
      and ts.status = 'open'
      and oi.status <> 'cancelled'
    order by o.created_at asc`;

  /*
   * Lo stato della cassa viaggia con le comande.
   *
   * Se il Registratore Telematico è fermo, i conti si chiudono lo stesso e
   * nessun documento commerciale esce: oggi se ne accorge solo chi apre i
   * Corrispettivi, che in servizio non apre nessuno. Lo schermo delle comande
   * è l'unico che qualcuno guarda davvero, quindi l'allarme passa di qui.
   * Gli errori si contano sulla giornata di servizio in corso e non da
   * sempre: un errore di tre settimane fa non è una stampante ferma adesso.
   */
  const [locale] = await sql<
    { soglia_attesa_min: number; fiscali_errore: number; agente_fermo: boolean }[]
  >`
    select v.soglia_attesa_min,
           (select count(*)::int from fiscal_documents fd
             where fd.venue_id = v.id
               and fd.stato = 'errore'
               and fd.service_date =
                   ((now() at time zone coalesce(v.timezone, 'Europe/Rome'))
                     - make_interval(hours => v.giornata_stacco_ora))::date)
             as fiscali_errore,
           (v.rt_attivo and v.rt_modalita = 'agente'
            and (v.rt_agente_visto_at is null
                 or v.rt_agente_visto_at < now() - interval '10 minutes'))
             as agente_fermo
      from venues v where v.id = ${venue.venueId}`;

  return NextResponse.json({
    items: rows,
    soglia: locale?.soglia_attesa_min ?? 20,
    fiscale: {
      errori: locale?.fiscali_errore ?? 0,
      agenteFermo: locale?.agente_fermo ?? false,
    },
  });
}
