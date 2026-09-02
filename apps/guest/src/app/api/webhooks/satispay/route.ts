import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { getSatispayPayment } from "@repo/shared/satispay";
import { outstandingBalanceCents } from "@/lib/balance";

/**
 * Satispay chiama questo URL come semplice ping (nessuna firma sul
 * callback) — non va mai trattato come fonte di verità. Si rilegge lo
 * stato reale con una chiamata firmata a /payments/{id} prima di
 * aggiornare qualsiasi cosa nel nostro DB.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("payment_id");
  const venueId = url.searchParams.get("venue_id");

  if (!paymentId || !venueId) {
    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  const sql = db();
  const [venue] = await sql<
    { satispay_key_id: string | null; satispay_private_key: string | null }[]
  >`select satispay_key_id, satispay_private_key from venues where id = ${venueId}`;

  if (!venue?.satispay_key_id || !venue.satispay_private_key) {
    console.error(`[satispay-webhook] venue ${venueId} senza credenziali Satispay`);
    return NextResponse.json({ error: "Locale non configurato" }, { status: 500 });
  }

  const status = await getSatispayPayment(paymentId, venue.satispay_key_id, venue.satispay_private_key);

  if (status.status === "ACCEPTED") {
    const [payment] = await sql<{ id: string; table_session_id: string | null }[]>`
      update payments set status = 'succeeded'
      where provider_payment_id = ${paymentId}
      returning id, table_session_id`;

    if (!payment) {
      console.error(`[satispay-webhook] pagamento accettato senza riga corrispondente: ${paymentId}`);
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

  return NextResponse.json({ received: true });
}
