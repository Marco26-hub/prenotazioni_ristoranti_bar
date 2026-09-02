import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";
import { isEntitled } from "@repo/shared";
import { stripeClient } from "@/lib/stripe";
import { outstandingBalanceCents } from "@/lib/balance";

interface CreateIntentBody {
  sessionId: string;
  tipCents?: number;
  /** Se valorizzato, si paga solo questi piatti (split per piatto). */
  orderItemIds?: string[];
}

export async function POST(request: Request) {
  const { allowed } = await checkRateLimit(clientKey(request, "create-intent"), 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as CreateIntentBody | null;
  if (!body?.sessionId) {
    return NextResponse.json({ error: "sessionId mancante" }, { status: 400 });
  }
  const tipCents = Number.isInteger(body.tipCents) ? Math.max(body.tipCents!, 0) : 0;

  const sql = db();
  const [session] = await sql<{ id: string; venue_id: string; status: string }[]>`
    select id, venue_id, status from table_sessions where id = ${body.sessionId}`;

  if (!session || session.status !== "open") {
    return NextResponse.json({ error: "Sessione tavolo non valida" }, { status: 404 });
  }

  const [venue] = await sql<
    {
      stripe_account_id: string | null;
      currency: string;
      subscription_status: string;
      subscription_period_end: Date | null;
    }[]
  >`select stripe_account_id, currency, subscription_status, subscription_period_end
      from venues where id = ${session.venue_id}`;

  if (!isEntitled(venue?.subscription_status, venue?.subscription_period_end)) {
    return NextResponse.json(
      { error: "Pagamento dal tavolo non attivo per questo locale — chiedi al personale" },
      { status: 402 }
    );
  }

  if (!venue?.stripe_account_id) {
    return NextResponse.json(
      { error: "Locale non ancora abilitato ai pagamenti" },
      { status: 409 }
    );
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    // Il locale risulta abilitato ma la piattaforma non è configurata:
    // per il cliente al tavolo deve restare un messaggio comprensibile.
    console.error("[create-intent] STRIPE_SECRET_KEY mancante");
    return NextResponse.json(
      { error: "Pagamento online non disponibile al momento — chiedi al personale" },
      { status: 503 }
    );
  }

  const stripe = stripeClient();
  const splitItemIds = body.orderItemIds?.filter(Boolean) ?? [];
  const isSplit = splitItemIds.length > 0;

  if (isSplit) {
    return createSplitPayment({
      sql,
      stripe,
      session,
      venue: { stripeAccountId: venue.stripe_account_id, currency: venue.currency },
      tipCents,
      orderItemIds: splitItemIds,
    });
  }

  // Doppio tap sul bottone Paga (o refresh pagina) non deve creare un
  // secondo PaymentIntent: riusa quello pending esistente se ancora valido.
  const [existingPending] = await sql<{ id: string; provider_payment_id: string }[]>`
    select id, provider_payment_id from payments
    where table_session_id = ${session.id} and status = 'pending' and split_type = 'full'`;

  if (existingPending) {
    const existingIntent = await stripe.paymentIntents.retrieve(
      existingPending.provider_payment_id,
      { stripeAccount: venue.stripe_account_id }
    );

    if (["requires_payment_method", "requires_confirmation", "requires_action"].includes(existingIntent.status)) {
      return NextResponse.json({
        clientSecret: existingIntent.client_secret,
        amountCents: existingIntent.amount,
      });
    }

    if (existingIntent.status === "succeeded") {
      return NextResponse.json({ error: "Conto già pagato" }, { status: 409 });
    }

    // canceled/failed lato Stripe ma la riga da noi è rimasta 'pending'
    // (webhook non ancora arrivato) — libera lo slot e permette un nuovo tentativo.
    await sql`update payments set status = 'failed' where id = ${existingPending.id}`;
  }

  const balanceCents = await outstandingBalanceCents(session.id);
  const amountCents = balanceCents + tipCents;
  if (amountCents <= 0) {
    return NextResponse.json({ error: "Nessun importo da pagare" }, { status: 409 });
  }

  const intent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: (venue.currency ?? "eur").toLowerCase(),
      automatic_payment_methods: { enabled: true },
      application_fee_amount: Math.round(amountCents * 0.015), // margine piattaforma, provvisorio
      metadata: { table_session_id: session.id, venue_id: session.venue_id },
    },
    { stripeAccount: venue.stripe_account_id }
  );

  try {
    await sql`
      insert into payments (
        venue_id, table_session_id, amount_cents, tip_cents,
        method, provider, provider_payment_id, split_type, status
      ) values (
        ${session.venue_id}, ${session.id}, ${balanceCents}, ${tipCents},
        'card', 'stripe', ${intent.id}, 'full', 'pending'
      )`;
  } catch (err) {
    // Race genuina: un'altra richiesta ha inserito il pending un istante
    // prima (vinta dallo unique index). Annulla l'intent orfano appena
    // creato e ritorna quello del vincitore, invece di sprecarlo/duplicarlo.
    const isUniqueViolation = err instanceof Error && "code" in err && err.code === "23505";
    if (!isUniqueViolation) throw err;

    await stripe.paymentIntents.cancel(intent.id, { stripeAccount: venue.stripe_account_id });

    const [winner] = await sql<{ provider_payment_id: string }[]>`
      select provider_payment_id from payments
      where table_session_id = ${session.id} and status = 'pending' and split_type = 'full'`;
    const winnerIntent = await stripe.paymentIntents.retrieve(winner.provider_payment_id, {
      stripeAccount: venue.stripe_account_id,
    });
    return NextResponse.json({
      clientSecret: winnerIntent.client_secret,
      amountCents: winnerIntent.amount,
    });
  }

  return NextResponse.json({ clientSecret: intent.client_secret, amountCents });
}

/**
 * Pagamento di alcuni piatti soltanto. Più commensali possono pagare in
 * contemporanea, quindi la corsa da evitare non è "due pagamenti sullo
 * stesso tavolo" ma "due pagamenti sullo stesso piatto": le righe scelte
 * vengono bloccate con SELECT ... FOR UPDATE e impegnate in
 * payment_order_items dentro la stessa transazione.
 */
async function createSplitPayment(params: {
  sql: ReturnType<typeof db>;
  stripe: ReturnType<typeof stripeClient>;
  session: { id: string; venue_id: string };
  venue: { stripeAccountId: string; currency: string };
  tipCents: number;
  orderItemIds: string[];
}) {
  const { sql, stripe, session, venue, tipCents, orderItemIds } = params;

  let claimed: { id: string; amount_cents: number }[];
  try {
    claimed = await sql.begin(async (tx) => {
      const rows = await tx<{ id: string; amount_cents: number }[]>`
        select oi.id, (oi.quantity * oi.unit_price_cents) as amount_cents
        from order_items oi
        join orders o on o.id = oi.order_id
        where oi.id in ${tx(orderItemIds)}
          and o.table_session_id = ${session.id}
          and o.status != 'cancelled'
          and oi.status != 'cancelled'
          and not exists (
            select 1 from payment_order_items poi
            join payments p on p.id = poi.payment_id
            where poi.order_item_id = oi.id and p.status in ('pending', 'succeeded')
          )
        for update of oi`;

      if (rows.length !== orderItemIds.length) {
        throw new Error("ITEMS_UNAVAILABLE");
      }
      return rows;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ITEMS_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Alcuni piatti sono già stati pagati o sono in pagamento" },
        { status: 409 }
      );
    }
    throw err;
  }

  const itemsTotal = claimed.reduce((sum, r) => sum + r.amount_cents, 0);
  const amountCents = itemsTotal + tipCents;
  if (amountCents <= 0) {
    return NextResponse.json({ error: "Nessun importo da pagare" }, { status: 409 });
  }

  const intent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: (venue.currency ?? "eur").toLowerCase(),
      automatic_payment_methods: { enabled: true },
      application_fee_amount: Math.round(amountCents * 0.015),
      metadata: { table_session_id: session.id, venue_id: session.venue_id },
    },
    { stripeAccount: venue.stripeAccountId }
  );

  await sql.begin(async (tx) => {
    const [payment] = await tx<{ id: string }[]>`
      insert into payments (
        venue_id, table_session_id, amount_cents, tip_cents,
        method, provider, provider_payment_id, split_type, status
      ) values (
        ${session.venue_id}, ${session.id}, ${itemsTotal}, ${tipCents},
        'card', 'stripe', ${intent.id}, 'per_item', 'pending'
      ) returning id`;

    for (const item of claimed) {
      await tx`
        insert into payment_order_items (payment_id, order_item_id, amount_cents)
        values (${payment.id}, ${item.id}, ${item.amount_cents})`;
    }
  });

  return NextResponse.json({ clientSecret: intent.client_secret, amountCents });
}
