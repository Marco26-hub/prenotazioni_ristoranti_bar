import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { closeTableInPerson } from "./close-table-actions";
import { setOrderItemStatus } from "./orders/actions";
import type { OrderItemStatus } from "@repo/shared";
import { Sala, type TavoloSala, type RigaOrdine } from "./sala";

interface RigaTavolo {
  id: string;
  code: string;
  seats: number;
  shape: string;
  zone: string | null;
  pos_x: number | null;
  pos_y: number | null;
}

interface RigaSessione {
  table_id: string;
  session_id: string;
  opened_at: Date;
  guest_count: number;
  ordinato: string | null;
  pagato: string | null;
  n_pagamenti: number;
  ultimo_pagamento: Date | null;
}

interface RigaComanda {
  table_session_id: string;
  nome: string;
  item_id: string;
  quantita: number;
  prezzo_cents: number;
  stato: string;
  note: string | null;
  trattenuto: boolean;
  ordinato_il: Date;
  scelte: Array<{ opzione: string }>;
}

export default async function DashboardPage() {
  const session = await auth();
  const venue = session?.venues[0];

  if (!venue) {
    return (
      <main className="p-4">
        <p>Nessun locale associato a questo utente.</p>
      </main>
    );
  }

  const sql = db();

  const tables = await sql<RigaTavolo[]>`
    select id, code, seats, shape, zone, pos_x, pos_y from tables
     where venue_id = ${venue.venueId} and active = true
     order by code`;

  const [locale] = await sql<
    {
      floor_plan_url: string | null;
      floor_plan_opacity: number;
      openrouter_api_key: string | null;
      soglia_attesa_min: number;
      soglia_liberazione_min: number;
    }[]
  >`select floor_plan_url, floor_plan_opacity, openrouter_api_key,
           soglia_attesa_min, soglia_liberazione_min
      from venues where id = ${venue.venueId}`;

  // Ordinato e pagato in due sottoquery invece che con due join: incrociarli
  // nella stessa join moltiplicherebbe le righe dei pagamenti per quelle
  // delle comande, gonfiando entrambi i totali.
  const sessioni = await sql<RigaSessione[]>`
    select ts.table_id, ts.id as session_id, ts.opened_at, ts.guest_count,
           (select sum(oi.quantity * oi.unit_price_cents)
              from order_items oi
              join orders o on o.id = oi.order_id
             where o.table_session_id = ts.id
               and o.status != 'cancelled' and oi.status != 'cancelled') as ordinato,
           (select sum(p.amount_cents) from payments p
             where p.table_session_id = ts.id and p.status = 'succeeded') as pagato,
           (select count(*)::int from payments p
             where p.table_session_id = ts.id and p.status = 'succeeded') as n_pagamenti,
           (select max(p.created_at) from payments p
             where p.table_session_id = ts.id and p.status = 'succeeded') as ultimo_pagamento
      from table_sessions ts
     where ts.venue_id = ${venue.venueId} and ts.status = 'open'`;

  const comande = await sql<RigaComanda[]>`
    select o.table_session_id, oi.id as item_id, mi.name as nome,
           oi.quantity as quantita,
           -- Il prezzo bloccato alla comanda, non quello del menu di oggi:
           -- è quello che il cliente si vedrà sul conto.
           oi.quantity * oi.unit_price_cents as prezzo_cents,
           oi.status as stato, oi.notes as note,
           (oi.held_at is not null) as trattenuto,
           o.created_at as ordinato_il,
           oi.selected_options as scelte
      from order_items oi
      join orders o on o.id = oi.order_id
      join menu_items mi on mi.id = oi.menu_item_id
      join table_sessions ts on ts.id = o.table_session_id
     where ts.venue_id = ${venue.venueId} and ts.status = 'open'
       and o.status != 'cancelled' and oi.status != 'cancelled'
     order by o.created_at, mi.name`;

  const righePerSessione = new Map<string, RigaOrdine[]>();
  for (const c of comande) {
    const lista = righePerSessione.get(c.table_session_id) ?? [];
    // La variante viaggia accanto alla nota: in sala servono entrambe.
    const etichetta = (c.scelte ?? []).map((s) => s.opzione).join(" · ");
    lista.push({
      nome: etichetta ? `${c.nome} — ${etichetta}` : c.nome,
      quantita: c.quantita,
      prezzoCents: Number(c.prezzo_cents),
      id: c.item_id,
      trattenuto: c.trattenuto,
      ordinatoIl: c.ordinato_il.toISOString(),
      stato: c.stato,
      note: c.note,
    });
    righePerSessione.set(c.table_session_id, lista);
  }

  const perTavolo = new Map(sessioni.map((s) => [s.table_id, s]));

  const tavoli: TavoloSala[] = tables.map((t) => {
    const s = perTavolo.get(t.id);
    return {
      id: t.id,
      codice: t.code,
      posti: t.seats,
      forma: t.shape,
      zona: t.zone,
      x: t.pos_x,
      y: t.pos_y,
      sessionId: s?.session_id ?? null,
      // Serializzato in ISO: un oggetto Date non attraversa il confine fra
      // componente server e componente client.
      apertoDa: s ? s.opened_at.toISOString() : null,
      coperti: s?.guest_count ?? 1,
      ordinatoCents: Number(s?.ordinato ?? 0),
      pagatoCents: Number(s?.pagato ?? 0),
      nPagamenti: s?.n_pagamenti ?? 0,
      ultimoPagamento: s?.ultimo_pagamento ? s.ultimo_pagamento.toISOString() : null,
      righe: s ? (righePerSessione.get(s.session_id) ?? []) : [],
    };
  });

  async function chiudiConto(sessionId: string) {
    "use server";
    await closeTableInPerson(sessionId);
  }

  // La sala è dove il titolare guarda: doverci andare, vedere un piatto
  // pronto e poi cambiare pagina per segnarlo servito è un passaggio in più
  // che nessuno fa, e lo stato resta indietro.
  async function avanzaRiga(itemId: string, a: string, da: string) {
    "use server";
    return setOrderItemStatus(itemId, a as OrderItemStatus, da as OrderItemStatus);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-5">
      <Sala
        tavoli={tavoli}
        chiudiConto={chiudiConto}
        avanzaRiga={avanzaRiga}
        piantina={locale?.floor_plan_url ?? null}
        piantinaOpacita={locale?.floor_plan_opacity ?? 35}
        aiAttiva={Boolean(locale?.openrouter_api_key)}
        sogliaMin={locale?.soglia_attesa_min ?? 20}
        sogliaLiberazioneMin={locale?.soglia_liberazione_min ?? 15}
      />


    </main>
  );
}
