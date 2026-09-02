"use server";

import { db } from "@repo/shared/db";
import { decryptSecret } from "@repo/shared/crypto";
import { auth } from "@/auth";
import { invoicetronicClient } from "@/lib/invoicetronic";
import { revalidatePath } from "next/cache";

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

export async function syncInvoice(invoiceId: string) {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return { error: "Non autorizzato" };

  const sql = db();
  const [row] = await sql<{ provider_invoice_id: string | null; invoice_provider_api_key: string | null }[]>`
    select i.provider_invoice_id, v.invoice_provider_api_key
      from invoices i join venues v on v.id = i.venue_id
     where i.id = ${invoiceId} and i.venue_id = ${venue.venueId}`;
  if (!row?.provider_invoice_id || !row.invoice_provider_api_key) return { error: "Fattura o API key non disponibile" };

  try {
    const provider = await invoicetronicClient(decryptSecret(row.invoice_provider_api_key)).sendIdGet(Number(row.provider_invoice_id), false);
    const state = provider.data.latest_state ? STATUS[provider.data.latest_state] : null;
    await sql`
      update invoices set
        status = coalesce(${state}, status),
        sdi_identifier = coalesce(${provider.data.identifier ?? null}, sdi_identifier)
      where id = ${invoiceId}`;
    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sincronizzazione non riuscita" };
  }
}
