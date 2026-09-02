import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";
import { auth } from "@/auth";
import { PrintButton } from "../print-button";

const STATUS: Record<string, string> = {
  pending: "In lavorazione",
  sent: "Inviata a SDI",
  delivered: "Consegnata",
  rejected: "Rifiutata",
};

export default async function InvoiceDetailPage({ params }: PageProps<"/dashboard/invoices/[id]">) {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) notFound();
  const { id } = await params;
  const sql = db();
  const [invoice] = await sql<{
    invoice_number: number | null;
    status: string;
    provider_invoice_id: string | null;
    sdi_identifier: string | null;
    xml_url: string | null;
    created_at: Date;
    amount_cents: number;
    provider: string;
  }[]>`
    select i.invoice_number, i.status, i.provider_invoice_id, i.sdi_identifier,
           i.xml_url, i.created_at, p.amount_cents, p.provider
      from invoices i join payments p on p.id = i.payment_id
     where i.id = ${id} and i.venue_id = ${venue.venueId}`;
  if (!invoice) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/invoices" className="text-sm text-muted underline">← Fatture</Link>
          <h1 className="mt-3 text-2xl font-semibold">Fattura {invoice.invoice_number ?? "—"}</h1>
        </div>
        <PrintButton />
      </div>
      <dl className="divide-y divide-border rounded-xl border border-border bg-surface">
        <div className="flex justify-between gap-4 p-4"><dt className="text-muted">Stato</dt><dd className="font-medium">{STATUS[invoice.status] ?? invoice.status}</dd></div>
        <div className="flex justify-between gap-4 p-4"><dt className="text-muted">Data</dt><dd>{new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(invoice.created_at)}</dd></div>
        <div className="flex justify-between gap-4 p-4"><dt className="text-muted">Totale</dt><dd className="font-semibold tabular-nums">{(invoice.amount_cents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</dd></div>
        <div className="flex justify-between gap-4 p-4"><dt className="text-muted">Provider pagamento</dt><dd>{invoice.provider}</dd></div>
        <div className="flex justify-between gap-4 break-all p-4"><dt className="text-muted">ID Invoicetronic</dt><dd className="font-mono text-xs">{invoice.provider_invoice_id ?? "—"}</dd></div>
        <div className="flex justify-between gap-4 break-all p-4"><dt className="text-muted">ID SDI</dt><dd className="font-mono text-xs">{invoice.sdi_identifier ?? "In attesa"}</dd></div>
      </dl>
      <p className="mt-4 text-sm text-muted">
        Il documento fiscale originale viene conservato e gestito da Invoicetronic.
        {invoice.xml_url ? <>{" "}<a href={invoice.xml_url} target="_blank" rel="noreferrer" className="underline">Apri XML</a>.</> : " L'XML sarà collegabile quando disponibile."}
      </p>
    </main>
  );
}
