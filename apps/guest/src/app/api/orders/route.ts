import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientIp } from "@repo/shared/rate-limit";
import { isEntitled } from "@repo/shared";

interface CreateOrderBody {
  sessionId: string;
  items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
}

/** Le note finiscono stampate in comanda: tagliate, non rifiutate. */
const MAX_NOTE_LENGTH = 140;

export async function POST(request: Request) {
  const { allowed } = await checkRateLimit(`orders:${clientIp(request)}`, 20, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as CreateOrderBody | null;

  if (!body?.sessionId || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }
  if (body.items.some((i) => !i.menuItemId || !Number.isInteger(i.quantity) || i.quantity < 1)) {
    return NextResponse.json({ error: "Righe ordine non valide" }, { status: 400 });
  }

  const sql = db();

  // La sessione deve esistere ed essere aperta — il sessionId da solo non
  // autorizza nulla, ma limita la scrittura a un tavolo con sessione attiva.
  const [session] = await sql<{ id: string; venue_id: string; status: string }[]>`
    select id, venue_id, status from table_sessions where id = ${body.sessionId}`;

  if (!session || session.status !== "open") {
    return NextResponse.json({ error: "Sessione tavolo non valida" }, { status: 404 });
  }

  // Il servizio è a canone: se il locale non ha un abbonamento valido i suoi
  // clienti non possono ordinare. Il controllo sta qui e non solo in UI
  // perché questo endpoint è pubblico.
  const [venueSub] = await sql<
    { subscription_status: string; subscription_period_end: Date | null }[]
  >`select subscription_status, subscription_period_end
      from venues where id = ${session.venue_id}`;

  if (!isEntitled(venueSub?.subscription_status, venueSub?.subscription_period_end)) {
    return NextResponse.json(
      { error: "Ordine dal tavolo non attivo per questo locale — chiedi al personale" },
      { status: 402 }
    );
  }

  const menuItemIds = body.items.map((i) => i.menuItemId);
  const menuItems = await sql<
    { id: string; price_cents: number; available: boolean; venue_id: string }[]
  >`select id, price_cents, available, venue_id from menu_items where id in ${sql(menuItemIds)}`;

  if (menuItems.length !== menuItemIds.length) {
    return NextResponse.json({ error: "Piatto non trovato" }, { status: 404 });
  }
  if (menuItems.some((m) => m.venue_id !== session.venue_id || !m.available)) {
    return NextResponse.json({ error: "Piatto non disponibile" }, { status: 409 });
  }

  const priceByItem = new Map(menuItems.map((m) => [m.id, m.price_cents]));

  const orderId = await sql.begin(async (tx) => {
    const [order] = await tx<{ id: string }[]>`
      insert into orders (venue_id, table_session_id, status)
      values (${session.venue_id}, ${session.id}, 'confirmed')
      returning id`;

    for (const line of body.items) {
      const notes =
        typeof line.notes === "string" && line.notes.trim()
          ? line.notes.trim().slice(0, MAX_NOTE_LENGTH)
          : null;

      await tx`
        insert into order_items (order_id, menu_item_id, quantity, unit_price_cents, notes, status)
        values (
          ${order.id},
          ${line.menuItemId},
          ${line.quantity},
          ${priceByItem.get(line.menuItemId)!},
          ${notes},
          'sent_to_kitchen'
        )`;
    }

    return order.id;
  });

  return NextResponse.json({ orderId }, { status: 201 });
}
