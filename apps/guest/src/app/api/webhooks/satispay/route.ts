import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { accodaDocumento } from "@repo/shared/fiscale";
import { getSatispayPayment } from "@repo/shared/satispay";
import { decryptSecret } from "@repo/shared/crypto";
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

  const status = await getSatispayPayment(
    paymentId,
    venue.satispay_key_id,
    decryptSecret(venue.satispay_private_key)
  );

  if (status.status === "ACCEPTED") {
    /*
     * Si promuove solo una riga ancora in attesa.
     *
     * Senza `status = 'pending'` questa update riportava a 'succeeded'
     * qualsiasi riga, compresa una già archiviata come fallita: il conto
     * poteva nel frattempo essere stato saldato da un altro commensale, e il
     * secondo incasso rientrava in silenzio in una riga che nessuno stava più
     * guardando. Una consegna ripetuta dello stesso webhook — Satispay le fa,
     * ed è normale — non deve produrre nulla la seconda volta.
     */
    const [payment] = await sql<{ id: string; table_session_id: string | null }[]>`
      update payments set status = 'succeeded'
      where provider_payment_id = ${paymentId} and status = 'pending'
      returning id, table_session_id`;

    if (!payment) {
      const [esistente] = await sql<{ id: string; status: string }[]>`
        select id, status from payments where provider_payment_id = ${paymentId}`;

      if (!esistente) {
        console.error(
          `[satispay-webhook] pagamento accettato senza riga corrispondente: ${paymentId}`
        );
        return NextResponse.json({ error: "Payment record not found" }, { status: 500 });
      }

      if (esistente.status === "failed") {
        // Incassato da Satispay su una riga che avevamo archiviato: il conto
        // può essere già stato saldato altrimenti. Va guardato da una persona.
        console.error(
          `[satispay-webhook] incasso su riga già archiviata ${esistente.id}: possibile doppio addebito da rimborsare`
        );
      }

      // Consegna ripetuta o riga già a posto: nulla da fare, e va risposto 200
      // o Satispay continua a riprovare.
      return NextResponse.json({ received: true });
    }

    if (payment.table_session_id) {
      const remaining = await outstandingBalanceCents(payment.table_session_id);
      if (remaining <= 0) {
        await sql`
          update table_sessions set status = 'closed', closed_at = now()
          where id = ${payment.table_session_id}`;
        // Pagato tutto dall'app: il conto è chiuso e va certificato come
        // quello chiuso in cassa. Il registratore non lo raggiungiamo da qui,
        // quindi il documento entra in coda e lo emette l'agente sul posto.
        await accodaDocumento(sql, payment.table_session_id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
