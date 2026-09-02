import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { stripeClient } from "@/lib/stripe";
import { outstandingBalanceCents } from "@/lib/balance";

interface CreateIntentBody {
  sessionId: string;
  tipCents?: number;
}

export async function POST(request: Request) {
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

  const balanceCents = await outstandingBalanceCents(session.id);
  const amountCents = balanceCents + tipCents;
  if (amountCents <= 0) {
    return NextResponse.json({ error: "Nessun importo da pagare" }, { status: 409 });
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

  await sql`
    insert into payments (
      venue_id, table_session_id, amount_cents, tip_cents,
      method, provider, provider_payment_id, split_type, status
    ) values (
      ${session.venue_id}, ${session.id}, ${balanceCents}, ${tipCents},
      'card', 'stripe', ${intent.id}, 'full', 'pending'
    )`;

  return NextResponse.json({ clientSecret: intent.client_secret, amountCents });
}
