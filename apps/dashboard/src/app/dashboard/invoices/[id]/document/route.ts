import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { decryptSecret } from "@repo/shared/crypto";
import { invoicetronicClient } from "@/lib/invoicetronic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const { id } = await params;
  const sql = db();
  const [row] = await sql<{ provider_invoice_id: string | null; invoice_provider_api_key: string | null }[]>`
    select i.provider_invoice_id, v.invoice_provider_api_key
      from invoices i join venues v on v.id = i.venue_id
     where i.id = ${id} and i.venue_id = ${venue.venueId}`;
  if (!row?.provider_invoice_id || !row.invoice_provider_api_key) return NextResponse.json({ error: "Documento non disponibile" }, { status: 404 });

  try {
    const response = await invoicetronicClient(decryptSecret(row.invoice_provider_api_key)).sendIdGet(Number(row.provider_invoice_id), true);
    const payload = response.data.payload;
    const xml = response.data.encoding === "Base64" ? Buffer.from(payload, "base64").toString("utf8") : payload;
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="fattura-${row.provider_invoice_id}.xml"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Documento non recuperabile da Invoicetronic" }, { status: 502 });
  }
}
