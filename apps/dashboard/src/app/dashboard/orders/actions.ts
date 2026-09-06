"use server";

import { revalidatePath } from "next/cache";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";
import type { OrderItemStatus, StaffRole } from "@repo/shared";
import { linguaUtente } from "@/lib/lingua";
import { tServizio } from "@/i18n/servizio";

/**
 * Il traduttore che gli aiutanti qui sotto si passano.
 *
 * Lo ricevono come parametro invece di rileggere la lingua ognuno per conto
 * suo: `linguaUtente()` interroga la sessione e il database, e farlo tre volte
 * dentro una sola azione sarebbe tre giri per una frase sola.
 */
type T = ReturnType<typeof tServizio>;

/**
 * Come si chiama chi ha agito, congelato al momento del gesto.
 *
 * L'etichetta viene copiata nel registro invece di essere ricostruita da una
 * join: se domani l'addetto cambia nome o lascia il locale, la comanda di
 * stasera deve continuare a dire chi l'ha servita.
 */
/**
 * I reparti su cui l'addetto può agire. Vuoto significa tutti.
 *
 * Letto qui a ogni azione e non messo nel token: un permesso tolto deve
 * valere subito, non alla prossima sessione, e un token dura dodici ore.
 */
async function repartiAddetto(userId: string, venueId: string): Promise<string[]> {
  const sql = db();
  const [r] = await sql<{ reparti: string[] }[]>`
    select reparti from venue_staff
     where user_id = ${userId} and venue_id = ${venueId}`;
  return r?.reparti ?? [];
}

/** Il reparto di una riga di comanda, risalendo alla sua categoria. */
async function repartoDiRiga(orderItemId: string): Promise<string> {
  const sql = db();
  const [r] = await sql<{ reparto: string }[]>`
    select coalesce(mc.reparto, 'cucina') as reparto
      from order_items oi
      join menu_items mi on mi.id = oi.menu_item_id
      left join menu_categories mc on mc.id = mi.category_id
     where oi.id = ${orderItemId}`;
  return r?.reparto ?? "cucina";
}

const NOME_REPARTO: Record<string, Parameters<T>[0]> = {
  cucina: "reparto.minuscolo.cucina",
  bar: "reparto.minuscolo.bar",
  pizzeria: "reparto.minuscolo.pizzeria",
  pasticceria: "reparto.minuscolo.pasticceria",
};

async function vietatoPerReparto(
  userId: string,
  venueId: string,
  orderItemId: string,
  t: T
): Promise<string | null> {
  const suoi = await repartiAddetto(userId, venueId);
  if (suoi.length === 0) return null;
  const reparto = await repartoDiRiga(orderItemId);
  if (suoi.includes(reparto)) return null;
  // Il reparto senza nome nostro resta com'è scritto in tabella: è il nome che
  // il locale gli ha dato, e tradurlo non è compito nostro.
  const chiave = NOME_REPARTO[reparto];
  return t("errore.reparto", { reparto: chiave ? t(chiave) : reparto });
}

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

const NEGATO: Record<string, Parameters<T>[0]> = {
  ready: "errore.ruolo.ready",
  served: "errore.ruolo.served",
};

function puo(role: StaffRole, status: OrderItemStatus, t: T): string | null {
  if (PERMESSI[role]?.includes(status)) return null;
  return t(NEGATO[status] ?? "errore.ruolo");
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
  const t = tServizio(await linguaUtente());

  // Riverificato qui e non solo nascondendo il bottone: ogni Server Action è
  // un POST pubblico per chi conosce l'id.
  const vietato = puo(venue.role, status, t);
  if (vietato) return { error: vietato };

  const fuoriReparto = await vietatoPerReparto(userId, venue.venueId, orderItemId, t);
  if (fuoriReparto) return { error: fuoriReparto };

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
    return { error: t("errore.gia_spostato") };
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
  const t = tServizio(await linguaUtente());
  const sql = db();

  const fuoriReparto = await vietatoPerReparto(userId, venue.venueId, orderItemId, t);
  if (fuoriReparto) return { error: fuoriReparto };

  const [riga] = await sql<{ id: string }[]>`
    update order_items
       set held_at = ${trattieni ? sql`now()` : null},
           held_by = ${trattieni ? userId : null},
           held_note = ${trattieni ? (nota?.trim().slice(0, 120) || null) : null}
     where id = ${orderItemId}
       and order_id in (select id from orders where venue_id = ${venue.venueId})
       and status not in ('served', 'cancelled')
    returning id`;

  if (!riga) return { error: t("errore.riga") };

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
/**
 * Il reparto dello schermo, che non è il reparto dell'operatore.
 *
 * Sono due cose diverse e servono tutte e due. `venue_staff.reparti` dice a
 * cosa quell'account ha *diritto* di mettere le mani: è autorizzazione, e
 * resta. Questo dice cosa quello schermo sta *guardando* adesso: è il filtro
 * che l'operatore ha scelto sul tablet, e vale solo per lui.
 *
 * Finché c'era solo il primo, un locale a gestione familiare — due schermi,
 * un unico account padrone senza reparti assegnati — non aveva nessun
 * filtro: il banco sushi premeva "Tutto pronto" sul tavolo 5, il bottone
 * diceva 4 perché contava le righe che vedeva, e ne mandava fuori 9 portando
 * a 'ready' anche i fritti che la cucina non aveva ancora acceso. Sullo
 * schermo della cucina quelle righe sparivano dalla coda senza che nessuno
 * le avesse toccate, e il cameriere andava al passe a ritirare roba che non
 * esisteva.
 */
function filtroReparto(
  sql: ReturnType<typeof db>,
  reparto: string | null | undefined
) {
  if (!reparto || reparto === "tutti") return sql``;
  return sql`and coalesce((select mc.reparto from menu_items mi
                             left join menu_categories mc on mc.id = mi.category_id
                            where mi.id = oi.menu_item_id), 'cucina') = ${reparto}`;
}

export async function trattieniTavolo(
  tableCode: string,
  trattieni: boolean,
  reparto?: string | null
): Promise<{ aggiornate: number }> {
  const { venue, userId } = await requireVenue();
  const suoiReparti = await repartiAddetto(userId, venue.venueId);
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
       ${filtroReparto(sql, reparto)}
       ${
         suoiReparti.length > 0
           ? sql`and coalesce((select mc.reparto from menu_items mi
                                 left join menu_categories mc on mc.id = mi.category_id
                                where mi.id = oi.menu_item_id), 'cucina') in ${sql(suoiReparti)}`
           : sql``
       }
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
/**
 * Manda avanti in blocco tutto un gruppo.
 *
 * Il gruppo è il tavolo, oppure — dove si consegna al bancone — il numero di
 * ritiro, che lì fa da tavolo: "N. 7". Senza distinguerli, l'azione di
 * gruppo su una piadineria avrebbe spostato tutte le comande del bancone
 * insieme, cioè quelle di dieci clienti diversi.
 */
export async function advanceTableItems(
  gruppo: string,
  from: OrderItemStatus,
  to: OrderItemStatus,
  reparto?: string | null
): Promise<{ aggiornate: number; error?: string }> {
  const { venue, userId } = await requireVenue();

  const vietato = puo(venue.role, to, tServizio(await linguaUtente()));
  if (vietato) return { aggiornate: 0, error: vietato };

  const suoiReparti = await repartiAddetto(userId, venue.venueId);
  const sql = db();

  const righe = await sql<{ id: string }[]>`
    update order_items oi set status = ${to}
      from orders o, table_sessions ts, tables t
     where oi.order_id = o.id
       and o.table_session_id = ts.id
       and ts.table_id = t.id
       and o.venue_id = ${venue.venueId}
       and (
         case when ${gruppo} like 'N. %'
              then o.pickup_number = nullif(regexp_replace(${gruppo}, '^N\. ', ''), '')::int
              else t.code = ${gruppo} and o.pickup_number is null
         end
       )
       and oi.status = ${from}
       -- Un piatto trattenuto non si avvia in blocco: trattenerlo è stata una
       -- decisione esplicita e un "manda tutto" non deve scavalcarla.
       and oi.held_at is null
       -- Solo quello che questo schermo sta guardando: il bottone conta le
       -- righe filtrate, quindi deve spostare esattamente quelle.
       ${filtroReparto(sql, reparto)}
       -- E non si tocca il reparto altrui: "tutto pronto" dal bar non deve
       -- mandare fuori i primi.
       ${
         suoiReparti.length > 0
           ? sql`and coalesce((select mc.reparto from menu_items mi
                                 left join menu_categories mc on mc.id = mi.category_id
                                where mi.id = oi.menu_item_id), 'cucina') in ${sql(suoiReparti)}`
           : sql``
       }
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
