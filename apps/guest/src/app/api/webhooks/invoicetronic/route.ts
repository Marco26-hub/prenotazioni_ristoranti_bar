import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { decryptSecret } from "@repo/shared/crypto";
import { invoicetronicClient } from "@/lib/invoice/invoicetronic-client";
import { messaggioErrore } from "@repo/shared/errori";

const STATUS: Record<string, string> = {
  Inviato: "sent",
  Consegnato: "delivered",
  AccettatoDalDestinatario: "delivered",
  NonConsegnato: "rejected",
  Scartato: "rejected",
  RifiutatoDalDestinatario: "rejected",
  ImpossibilitaDiRecapito: "rejected",
  DecorrenzaTermini: "delivered",
  AttestazioneTrasmissioneFattura: "sent",
};

function signatureValid(header: string | null, payload: string, secret: string) {
  const parts = Object.fromEntries((header ?? "").split(",").map((part) => part.split("=")));
  const timestamp = parts.t;
  const received = parts.v1;
  if (!timestamp || !received || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export async function POST(request: Request) {
  const secret = process.env.INVOICETRONIC_WEBHOOK_SECRET;
  const payload = await request.text();
  if (!secret || !signatureValid(request.headers.get("Invoicetronic-Signature"), payload, secret)) {
    return NextResponse.json({ error: "Firma webhook non valida" }, { status: 401 });
  }

  const event = JSON.parse(payload) as { endpoint?: string; resource_id?: number };
  if (event.endpoint !== "send" || !event.resource_id) return NextResponse.json({ received: true });

  const sql = db();
  const rows = await sql<{ id: string; invoice_provider_api_key: string | null }[]>`
    select i.id, v.invoice_provider_api_key
      from invoices i join venues v on v.id = i.venue_id
     where i.provider_invoice_id = ${String(event.resource_id)}`;
  for (const row of rows) {
    if (!row.invoice_provider_api_key) continue;
    try {
      const invoice = await invoicetronicClient(decryptSecret(row.invoice_provider_api_key)).sendIdGet(event.resource_id, false);
      const state = invoice.data.latest_state ? STATUS[invoice.data.latest_state] : null;
      await sql`update invoices set status = coalesce(${state}, status), sdi_identifier = coalesce(${invoice.data.identifier ?? null}, sdi_identifier) where id = ${row.id}`;
    } catch (error) {
      console.error(`[invoicetronic-webhook] sync failed: ${messaggioErrore(error)}`);
      return NextResponse.json({ error: "Sincronizzazione non riuscita" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
