import { db } from "@repo/shared/db";
import { auth } from "@/auth";
import Link from "next/link";
import { PrintButton } from "./print-button";

const STATUS: Record<string, string> = {
  pending: "In lavorazione",
  sent: "Inviata a SDI",
  delivered: "Consegnata",
  rejected: "Rifiutata",
};

export default async function InvoicesPage() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  const sql = db();
  const invoices = await sql<
    {
      id: string;
      invoice_number: number | null;
      status: string;
      provider_invoice_id: string | null;
      sdi_identifier: string | null;
      xml_url: string | null;
      customer_email: string | null;
      emailed_at: Date | null;
      created_at: Date;
      amount_cents: number;
      payment_provider: string;
    }[]
  >`
    select i.id, i.invoice_number, i.status, i.provider_invoice_id,
           i.sdi_identifier, i.xml_url, i.customer_email, i.emailed_at, i.created_at,
           p.amount_cents, p.provider as payment_provider
      from invoices i
      join payments p on p.id = i.payment_id
     where i.venue_id = ${venue.venueId}
     order by i.created_at desc`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Amministrazione</p>
          <h1 className="text-2xl font-semibold tracking-tight">Fatture elettroniche</h1>
          <p className="mt-1 text-sm text-muted">
            Stato delle fatture inviate tramite Invoicetronic e SDI.
          </p>
        </div>
        <PrintButton />
      </div>

      {invoices.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Nessuna fattura generata.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Numero</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Importo</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 font-medium">Identificativo</th>
                <th className="px-4 py-3 font-medium">Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-4 font-medium tabular-nums">
                    {invoice.invoice_number ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-muted">
                    {new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(invoice.created_at)}
                  </td>
                  <td className="px-4 py-4 font-medium tabular-nums">
                    {(invoice.amount_cents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${invoice.status === "rejected" ? "border-danger text-danger" : invoice.status === "delivered" ? "border-success text-success" : "border-border"}`}>
                      {STATUS[invoice.status] ?? invoice.status}
                    </span>
                  </td>
                  <td className="max-w-48 truncate px-4 py-4 font-mono text-xs text-muted">
                    {invoice.sdi_identifier ?? invoice.provider_invoice_id ?? "In attesa"}
                  </td>
                  <td className="px-4 py-4">
                    <Link href={`/dashboard/invoices/${invoice.id}`} className="underline underline-offset-2">
                      Dettagli
                    </Link>
                    {invoice.xml_url ? (
                      <>
                        {" · "}
                      <a href={invoice.xml_url} className="underline underline-offset-2" target="_blank" rel="noreferrer">
                        Apri XML
                      </a>
                      </>
                    ) : (
                      <span className="ml-2 text-muted">XML su Invoicetronic</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
