import "server-only";
import { db } from "@repo/shared/db";

export interface UnpaidItem {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface Supplementi {
  copertoUnitarioCents: number;
  coperti: number;
  copertoTotaleCents: number;
  servizioPercent: number;
  servizioCents: number;
  totaleCents: number;
  etichettaCoperto: string;
}

/**
 * Coperto e servizio di una sessione.
 *
 * Calcolati al momento della lettura e non salvati come righe d'ordine: il
 * numero di coperti cambia mentre il tavolo è aperto — arriva un amico, uno
 * se ne va — e una riga scritta all'apertura resterebbe sbagliata.
 *
 * Sta qui e non in tre query diverse perché il saldo residuo, il conto
 * mostrato al cliente e la chiusura da parte dello staff devono dare lo
 * stesso numero: se uno solo dimenticasse il coperto, il tavolo non si
 * chiuderebbe mai per una differenza di due euro.
 */
export async function supplementiCents(sessionId: string): Promise<Supplementi> {
  const sql = db();

  const [riga] = await sql<
    {
      guest_count: number;
      cover_charge_cents: number;
      service_percent: string;
      cover_charge_label: string | null;
      ordinato: string | null;
    }[]
  >`
    select ts.guest_count, v.cover_charge_cents, v.service_percent,
           v.cover_charge_label,
           (select sum(oi.quantity * oi.unit_price_cents)
              from order_items oi
              join orders o on o.id = oi.order_id
             where o.table_session_id = ts.id
               and o.status != 'cancelled' and oi.status != 'cancelled') as ordinato
      from table_sessions ts
      join venues v on v.id = ts.venue_id
     where ts.id = ${sessionId}`;

  const copertoUnitario = riga?.cover_charge_cents ?? 0;
  const coperti = riga?.guest_count ?? 1;
  const copertoTotale = copertoUnitario * coperti;

  const servizioPercent = Number(riga?.service_percent ?? 0);
  const ordinato = Number(riga?.ordinato ?? 0);
  // Il servizio si calcola sull'ordinato, non sul coperto: sommarlo al
  // coperto significherebbe far pagare una percentuale su una voce fissa.
  const servizio = Math.round((ordinato * servizioPercent) / 100);

  return {
    copertoUnitarioCents: copertoUnitario,
    coperti,
    copertoTotaleCents: copertoTotale,
    servizioPercent,
    servizioCents: servizio,
    totaleCents: copertoTotale + servizio,
    etichettaCoperto: riga?.cover_charge_label?.trim() || "Coperto",
  };
}

/**
 * Saldo residuo di una sessione tavolo: totale ordinato più coperto e
 * servizio, meno i pagamenti già riusciti. Vale sia per il pagamento a
 * saldo pieno sia come somma di quanto resta dopo pagamenti parziali.
 */
export async function outstandingBalanceCents(sessionId: string): Promise<number> {
  const sql = db();

  const [ordered] = await sql<{ total: string | null }[]>`
    select sum(oi.quantity * oi.unit_price_cents) as total
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.table_session_id = ${sessionId}
      and o.status != 'cancelled'
      and oi.status != 'cancelled'`;

  const [paid] = await sql<{ total: string | null }[]>`
    select sum(amount_cents) as total
    from payments
    where table_session_id = ${sessionId} and status = 'succeeded'`;

  const orderedTotal = Number(ordered?.total ?? 0);
  const paidTotal = Number(paid?.total ?? 0);
  const extra = await supplementiCents(sessionId);

  // Il coperto si aggiunge solo se qualcosa è stato ordinato: un tavolo
  // aperto per sbaglio non deve risultare a debito di due euro, e non
  // chiudersi mai per quello.
  const supplementi = orderedTotal > 0 ? extra.totaleCents : 0;

  return Math.max(orderedTotal + supplementi - paidTotal, 0);
}

/**
 * Piatti ancora da pagare: quelli non già impegnati da un pagamento riuscito
 * o in corso. Un pagamento fallito non blocca più le sue righe, così un
 * tentativo andato male non lascia piatti impagabili.
 */
export async function unpaidItems(sessionId: string): Promise<UnpaidItem[]> {
  const sql = db();

  const rows = await sql<
    { id: string; name: string; quantity: number; unit_price_cents: number }[]
  >`
    select oi.id, mi.name, oi.quantity, oi.unit_price_cents
    from order_items oi
    join orders o on o.id = oi.order_id
    join menu_items mi on mi.id = oi.menu_item_id
    where o.table_session_id = ${sessionId}
      and o.status != 'cancelled'
      and oi.status != 'cancelled'
      and not exists (
        select 1 from payment_order_items poi
        join payments p on p.id = poi.payment_id
        where poi.order_item_id = oi.id
          and p.status in ('pending', 'succeeded')
      )
    order by mi.name`;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    quantity: r.quantity,
    unitPriceCents: r.unit_price_cents,
    totalCents: r.quantity * r.unit_price_cents,
  }));
}
