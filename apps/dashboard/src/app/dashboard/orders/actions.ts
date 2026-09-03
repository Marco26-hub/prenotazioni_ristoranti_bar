"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";
import type { OrderItemStatus, StaffRole } from "@repo/shared";

/**
 * Come si chiama chi ha agito, congelato al momento del gesto.
 *
 * L'etichetta viene copiata nel registro invece di essere ricostruita da una
 * join: se domani l'addetto cambia nome o lascia il locale, la comanda di
 * stasera deve continuare a dire chi l'ha servita.
 */
async function etichettaAddetto(userId: string): Promise<string> {
  const sql = db();
  const [u] = await sql<{ name: string | null; email: string }[]>`
    select name, email from users where id = ${userId}`;
  return u?.name?.trim() || u?.email || "addetto sconosciuto";
}

/**
 * Chi può dichiarare cosa.
 *
 * "Pronto" è la parola della cucina: dice che il piatto esiste ed è al passe.
 * "Servito" è la parola della sala: dice che è arrivato al tavolo. Farle dire
 * a chiunque svuota entrambe — un cameriere che segna pronto sta indovinando,
 * un cuoco che segna servito sta chiudendo una riga che non ha portato, e il
 * registro di chi ha fatto cosa perde senso.
 *
 * Titolare e responsabile fanno tutto: in una trattoria piccola sono anche
 * cuoco e anche sala, e bloccarli sarebbe una regola contro il lavoro.
 */
const PERMESSI: Record<StaffRole, OrderItemStatus[]> = {
  owner: ["pending", "sent_to_kitchen", "preparing", "ready", "served", "cancelled"],
  manager: ["pending", "sent_to_kitchen", "preparing", "ready", "served", "cancelled"],
  // La sala manda la comanda in cucina e porta il piatto al tavolo.
  waiter: ["sent_to_kitchen", "preparing", "served", "cancelled"],
  // La cucina prende in carico e dichiara il pronto.
  kitchen: ["preparing", "ready"],
};

const NEGATO: Record<string, string> = {
  ready: "Solo la cucina può segnare un piatto pronto.",
  served: "Solo chi è in sala può segnare un piatto servito.",
};

function puo(role: StaffRole, status: OrderItemStatus): string | null {
  if (PERMESSI[role]?.includes(status)) return null;
  return NEGATO[status] ?? "Il tuo ruolo non può fare questa modifica.";
}

export async function setOrderItemStatus(
  orderItemId: string,
  status: OrderItemStatus,
  /**
   * Da quale stato si crede di partire.
   *
   * Con due palmari sullo stesso tavolo, chi ha lo schermo vecchio di quattro
   * secondi può far saltare uno stato: crede di portare "in preparazione" a
   * "pronto" mentre un altro l'ha già portato a "pronto", e il piatto
   * finirebbe "servito" senza essere mai uscito. Chi arriva secondo viene
   * fermato e vede il valore aggiornato al giro dopo.
   */
  atteso?: OrderItemStatus
): Promise<{ error?: string }> {
  const { venue, userId } = await requireVenue();

  // Riverificato qui e non solo nascondendo il bottone: ogni Server Action è
  // un POST pubblico per chi conosce l'id.
  const vietato = puo(venue.role, status);
  if (vietato) return { error: vietato };

  const sql = db();

  // order_items non ha venue_id diretto — verifica ownership via join,
  // altrimenti chiunque autenticato su un altro venue potrebbe modificare
  // comande non sue passando un id a caso.
  const [riga] = await sql<{ id: string; precedente: OrderItemStatus }[]>`
    update order_items set status = ${status}
    where id = ${orderItemId}
      and order_id in (select id from orders where venue_id = ${venue.venueId})
      ${atteso ? sql`and status = ${atteso}` : sql``}
    returning id, (select status from order_items where id = ${orderItemId}) as precedente`;

  if (!riga && atteso) {
    return { error: "Qualcuno l'ha già spostato: guarda lo stato aggiornato." };
  }

  if (riga) {
    await sql`
      insert into order_item_events
        (order_item_id, venue_id, user_id, user_label, azione, da_stato, a_stato)
      values (${orderItemId}, ${venue.venueId}, ${userId},
              ${await etichettaAddetto(userId)}, 'stato', ${riga.precedente}, ${status})`;
  }

  revalidatePath("/dashboard/orders");
  return {};
}

/**
 * Trattiene o libera una riga.
 *
 * Trattenere non cambia lo stato: il piatto resta al punto in cui era e
 * riparte da lì. Un piatto già servito non si trattiene — non avrebbe senso
 * e confonderebbe la cucina.
 */
export async function trattieniRiga(
  orderItemId: string,
  trattieni: boolean,
  nota?: string
): Promise<{ error?: string }> {
  const { venue, userId } = await requireVenue();
  const sql = db();

  const [riga] = await sql<{ id: string }[]>`
    update order_items
       set held_at = ${trattieni ? sql`now()` : null},
           held_by = ${trattieni ? userId : null},
           held_note = ${trattieni ? (nota?.trim().slice(0, 120) || null) : null}
     where id = ${orderItemId}
       and order_id in (select id from orders where venue_id = ${venue.venueId})
       and status not in ('served', 'cancelled')
    returning id`;

  if (!riga) return { error: "Riga non trovata o già servita" };

  await sql`
    insert into order_item_events
      (order_item_id, venue_id, user_id, user_label, azione)
    values (${orderItemId}, ${venue.venueId}, ${userId},
            ${await etichettaAddetto(userId)},
            ${trattieni ? "trattenuto" : "liberato"})`;

  revalidatePath("/dashboard/orders");
  return {};
}

/**
 * Trattiene o libera tutto quello che a un tavolo non è ancora partito.
 *
 * È il gesto vero: "ritarda i secondi del sei" si dice una volta, non piatto
 * per piatto con le mani occupate.
 */
export async function trattieniTavolo(
  tableCode: string,
  trattieni: boolean
): Promise<{ aggiornate: number }> {
  const { venue, userId } = await requireVenue();
  const sql = db();

  const righe = await sql<{ id: string }[]>`
    update order_items oi
       set held_at = ${trattieni ? sql`now()` : null},
           held_by = ${trattieni ? userId : null},
           held_note = null
      from orders o, table_sessions ts, tables t
     where oi.order_id = o.id
       and o.table_session_id = ts.id
       and ts.table_id = t.id
       and o.venue_id = ${venue.venueId}
       and t.code = ${tableCode}
       and oi.status not in ('served', 'cancelled')
       and oi.held_at is ${trattieni ? sql`null` : sql`not null`}
    returning oi.id`;

  if (righe.length > 0) {
    const label = await etichettaAddetto(userId);
    await sql`
      insert into order_item_events
        (order_item_id, venue_id, user_id, user_label, azione)
      select id, ${venue.venueId}, ${userId}, ${label},
             ${trattieni ? "trattenuto" : "liberato"}
        from unnest(${righe.map((r) => r.id)}::uuid[]) as id`;
  }

  revalidatePath("/dashboard/orders");
  return { aggiornate: righe.length };
}

/**
 * Avanza in blocco tutte le righe di un tavolo che si trovano in un dato
 * stato.
 *
 * In cucina i piatti di un tavolo escono insieme: toccarli uno per uno
 * significa sei tocchi con le mani occupate, e nel frattempo il piatto si
 * fredda. Il filtro sullo stato di partenza evita di trascinare avanti una
 * riga che qualcun altro ha già spostato mentre si guardava lo schermo.
 */
export async function advanceTableItems(
  tableCode: string,
  from: OrderItemStatus,
  to: OrderItemStatus
): Promise<{ aggiornate: number; error?: string }> {
  const { venue, userId } = await requireVenue();

  const vietato = puo(venue.role, to);
  if (vietato) return { aggiornate: 0, error: vietato };

  const sql = db();

  const righe = await sql<{ id: string }[]>`
    update order_items oi set status = ${to}
      from orders o, table_sessions ts, tables t
     where oi.order_id = o.id
       and o.table_session_id = ts.id
       and ts.table_id = t.id
       and o.venue_id = ${venue.venueId}
       and t.code = ${tableCode}
       and oi.status = ${from}
       -- Un piatto trattenuto non si avvia in blocco: trattenerlo è stata una
       -- decisione esplicita e un "manda tutto" non deve scavalcarla.
       and oi.held_at is null
    returning oi.id`;

  if (righe.length > 0) {
    const label = await etichettaAddetto(userId);
    await sql`
      insert into order_item_events
        (order_item_id, venue_id, user_id, user_label, azione, da_stato, a_stato)
      select id, ${venue.venueId}, ${userId}, ${label}, 'stato', ${from}, ${to}
        from unnest(${righe.map((r) => r.id)}::uuid[]) as id`;
  }

  revalidatePath("/dashboard/orders");
  return { aggiornate: righe.length };
}
