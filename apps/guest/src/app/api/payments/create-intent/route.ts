import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientIp } from "@repo/shared/rate-limit";
import { stripeClient } from "@/lib/stripe";
import { outstandingBalanceCents } from "@/lib/balance";

interface CreateIntentBody {
  sessionId: string;
  tipCents?: number;
}

export async function POST(request: Request) {
  const { allowed } = await checkRateLimit(`create-intent:${clientIp(request)}`, 10, 60);
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

  const [venue] = await sql<{ stripe_account_id: string | null; currency: string }[]>`
    select stripe_account_id, currency from venues where id = ${session.venue_id}`;

  if (!venue?.stripe_account_id) {
    return NextResponse.json(
      { error: "Locale non ancora abilitato ai pagamenti" },
      { status: 409 }
    );
  }

  const stripe = stripeClient();

  // Doppio tap sul bottone Paga (o refresh pagina) non deve creare un
  // secondo PaymentIntent: riusa quello pending esistente se ancora valido.
  const [existingPending] = await sql<{ id: string; provider_payment_id: string }[]>`
    select id, provider_payment_id from payments
    where table_session_id = ${session.id} and status = 'pending'`;

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
      where table_session_id = ${session.id} and status = 'pending'`;
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
