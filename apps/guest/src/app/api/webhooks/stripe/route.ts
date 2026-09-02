import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { stripeClient } from "@/lib/stripe";
import { outstandingBalanceCents } from "@/lib/balance";

/**
 * Webhook Stripe Connect: eventi degli account collegati (i locali) arrivano
 * qui se l'endpoint è registrato come "Connect webhook" nella dashboard
 * Stripe (non sul payment_intent diretto della piattaforma). Senza questo,
 * un pagamento riuscito lato Stripe non si riflette mai nel nostro DB.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 500 });
  }

  const rawBody = await request.text();
  const stripe = stripeClient();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Firma non valida: ${err instanceof Error ? err.message : "errore"}` },
      { status: 400 }
    );
  }

  const sql = db();

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as { id: string; metadata: Record<string, string> };

    const [payment] = await sql<{ id: string; table_session_id: string | null }[]>`
      update payments set status = 'succeeded'
      where provider_payment_id = ${intent.id}
      returning id, table_session_id`;

    if (!payment) {
      // Un pagamento riuscito lato Stripe che non trova riga da noi è
      // un'anomalia seria (soldi incassati, nulla registrato) — mai
      // ritornare 200 qui: Stripe deve ritentare la consegna, e l'errore
      // deve comparire nei log invece di sparire.
      console.error(
        `[stripe-webhook] payment_intent.succeeded senza riga payments corrispondente: ${intent.id}`
      );
      return NextResponse.json({ error: "Payment record not found" }, { status: 500 });
    }

    if (payment.table_session_id) {
      const remaining = await outstandingBalanceCents(payment.table_session_id);
      if (remaining <= 0) {
        await sql`
          update table_sessions set status = 'closed', closed_at = now()
          where id = ${payment.table_session_id}`;
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as { id: string };
    const [payment] = await sql<{ id: string }[]>`
      update payments set status = 'failed'
      where provider_payment_id = ${intent.id}
      returning id`;

    if (!payment) {
      console.error(
        `[stripe-webhook] payment_intent.payment_failed senza riga payments corrispondente: ${intent.id}`
      );
    }
  }

  return NextResponse.json({ received: true });
}
