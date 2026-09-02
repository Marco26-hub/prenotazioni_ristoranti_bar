import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { closeTableInPerson } from "./close-table-actions";
import { Sala, type TavoloSala, type RigaOrdine } from "./sala";

interface RigaTavolo {
  id: string;
  code: string;
  seats: number;
}

interface RigaSessione {
  table_id: string;
  session_id: string;
  opened_at: Date;
  guest_count: number;
  ordinato: string | null;
  pagato: string | null;
}

interface RigaComanda {
  table_session_id: string;
  nome: string;
  quantita: number;
  stato: string;
  note: string | null;
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
    select id, code, seats from tables
     where venue_id = ${venue.venueId} and active = true
     order by code`;

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
             where p.table_session_id = ts.id and p.status = 'succeeded') as pagato
      from table_sessions ts
     where ts.venue_id = ${venue.venueId} and ts.status = 'open'`;

  const comande = await sql<RigaComanda[]>`
    select o.table_session_id, mi.name as nome, oi.quantity as quantita,
           oi.status as stato, oi.notes as note
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
    lista.push({ nome: c.nome, quantita: c.quantita, stato: c.stato, note: c.note });
    righePerSessione.set(c.table_session_id, lista);
  }

  const perTavolo = new Map(sessioni.map((s) => [s.table_id, s]));

  const tavoli: TavoloSala[] = tables.map((t) => {
    const s = perTavolo.get(t.id);
    return {
      id: t.id,
      codice: t.code,
      posti: t.seats,
      sessionId: s?.session_id ?? null,
      // Serializzato in ISO: un oggetto Date non attraversa il confine fra
      // componente server e componente client.
      apertoDa: s ? s.opened_at.toISOString() : null,
      coperti: s?.guest_count ?? 1,
      ordinatoCents: Number(s?.ordinato ?? 0),
      pagatoCents: Number(s?.pagato ?? 0),
      righe: s ? (righePerSessione.get(s.session_id) ?? []) : [],
    };
  });

  async function chiudiConto(sessionId: string) {
    "use server";
    await closeTableInPerson(sessionId);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-5">
      <Sala tavoli={tavoli} chiudiConto={chiudiConto} />

      {tables.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Nessun tavolo configurato. Vai in <strong>QR e tavoli</strong> per
          aggiungerli.
        </p>
      )}
    </main>
  );
}
