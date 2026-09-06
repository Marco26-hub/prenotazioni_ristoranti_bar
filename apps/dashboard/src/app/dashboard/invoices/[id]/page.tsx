import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";
import { auth } from "@/auth";
import { PrintButton } from "../print-button";
import { SyncButton } from "../sync-button";
import { linguaUtente } from "@/lib/lingua";
import { tSoldi } from "@/i18n/soldi";
import { LinguaProvider } from "@repo/shared/i18n/contesto";

export default async function InvoiceDetailPage({ params }: PageProps<"/dashboard/invoices/[id]">) {
  const session = await auth();
  const lingua = await linguaUtente();
  const t = tSoldi(lingua);

  // Le etichette dello stato: i valori a database restano pending/sent/…
  const STATUS: Record<string, string> = {
    pending: t("fattura.stato.pending"),
    sent: t("fattura.stato.sent"),
    delivered: t("fattura.stato.delivered"),
    rejected: t("fattura.stato.rejected"),
  };

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
    customer_first_name: string | null;
    customer_last_name: string | null;
    customer_company_name: string | null;
    customer_email: string | null;
    customer_type: string | null;
    customer_sdi_code: string | null;
    customer_pec: string | null;
    customer_country_code: string | null;
    customer_tax_id: string | null;
    customer_address: string | null;
    customer_zip: string | null;
    customer_city: string | null;
    customer_province: string | null;
    emailed_at: Date | null;
    created_at: Date;
    amount_cents: number;
    provider: string;
  }[]>`
    select i.invoice_number, i.status, i.provider_invoice_id, i.sdi_identifier,
           i.xml_url, i.customer_first_name, i.customer_last_name,
           i.customer_company_name, i.customer_email, i.customer_type,
           i.customer_sdi_code, i.customer_pec, i.customer_country_code,
           i.customer_tax_id, i.customer_address, i.customer_zip,
           i.customer_city, i.customer_province, i.emailed_at,
           i.created_at, p.amount_cents, p.provider
      from invoices i join payments p on p.id = i.payment_id
     where i.id = ${id} and i.venue_id = ${venue.venueId}`;
  if (!invoice) notFound();

  return (
    <LinguaProvider lingua={lingua}>
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Link href="/dashboard/invoices" className="text-sm text-muted underline">{t("fattura.torna")}</Link>
            <h1 className="mt-3 text-2xl font-semibold">
              {t("fattura.dettaglio.titolo", { numero: invoice.invoice_number ?? "—" })}
            </h1>
          </div>
          <div className="flex gap-2"><SyncButton invoiceId={id} /><PrintButton /></div>
        </div>
        <dl className="divide-y divide-border rounded-xl border border-border bg-surface">
          <div className="flex justify-between gap-4 p-4"><dt className="text-muted">{t("fattura.campo.stato")}</dt><dd className="font-medium">{STATUS[invoice.status] ?? invoice.status}</dd></div>
          <div className="flex justify-between gap-4 p-4"><dt className="text-muted">{t("fattura.campo.data")}</dt><dd>{t.data(invoice.created_at)}</dd></div>
          <div className="flex justify-between gap-4 p-4"><dt className="text-muted">{t("fattura.campo.totale")}</dt><dd className="font-semibold tabular-nums">{t.prezzo(invoice.amount_cents)}</dd></div>
          <div className="flex justify-between gap-4 p-4"><dt className="text-muted">{t("fattura.campo.provider")}</dt><dd>{invoice.provider}</dd></div>
          <div className="flex justify-between gap-4 break-all p-4"><dt className="text-muted">{t("fattura.campo.id_invoicetronic")}</dt><dd className="font-mono text-xs">{invoice.provider_invoice_id ?? "—"}</dd></div>
          <div className="flex justify-between gap-4 break-all p-4"><dt className="text-muted">{t("fattura.campo.id_sdi")}</dt><dd className="font-mono text-xs">{invoice.sdi_identifier ?? t("fattura.in_attesa")}</dd></div>
          <div className="flex justify-between gap-4 p-4"><dt className="text-muted">{t("fattura.campo.cliente")}</dt><dd>{invoice.customer_company_name ?? ([invoice.customer_first_name, invoice.customer_last_name].filter(Boolean).join(" ") || "—")}</dd></div>
          <div className="flex justify-between gap-4 p-4"><dt className="text-muted">{t("fattura.campo.paese")}</dt><dd>{invoice.customer_country_code ?? "IT"}</dd></div>
          {invoice.customer_tax_id && <div className="flex justify-between gap-4 break-all p-4"><dt className="text-muted">{t("fattura.campo.id_fiscale_estero")}</dt><dd>{invoice.customer_tax_id}</dd></div>}
          <div className="flex justify-between gap-4 p-4 text-right"><dt className="text-left text-muted">{t("fattura.campo.sede")}</dt><dd>{[invoice.customer_address, invoice.customer_zip, invoice.customer_city, invoice.customer_province].filter(Boolean).join(", ") || "—"}</dd></div>
          {(invoice.customer_sdi_code || invoice.customer_pec) && <div className="flex justify-between gap-4 break-all p-4"><dt className="text-muted">{t("fattura.campo.recapito")}</dt><dd>{invoice.customer_sdi_code ? `SDI ${invoice.customer_sdi_code}` : `PEC ${invoice.customer_pec}`}</dd></div>}
          <div className="flex justify-between gap-4 p-4"><dt className="text-muted">{t("fattura.campo.copia_email")}</dt><dd>{invoice.emailed_at ? t("fattura.email.inviata") : t("fattura.email.non_inviata")}{invoice.customer_email ? ` · ${invoice.customer_email}` : ""}</dd></div>
        </dl>
        <p className="mt-4 text-sm text-muted">
          {t("fattura.conservazione")}
          {invoice.xml_url ? <> {" "}<a href={invoice.xml_url} target="_blank" rel="noreferrer" className="underline">{t("fattura.apri_xml")}</a>.</> : <> <a href={`/dashboard/invoices/${id}/document`} className="underline">{t("fattura.scarica_xml")}</a>.</>}
        </p>
      </main>
    </LinguaProvider>
  );
}
