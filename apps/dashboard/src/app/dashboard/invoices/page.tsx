import { db } from "@repo/shared/db";
import { auth } from "@/auth";
import Link from "next/link";
import { PrintButton } from "./print-button";
import { moduloAttivo } from "@/lib/authz";
import { ModuloNonAttivo } from "../modulo-non-attivo";
import { linguaUtente } from "@/lib/lingua";
import { tSoldi } from "@/i18n/soldi";
import { LinguaProvider } from "@repo/shared/i18n/contesto";

export default async function InvoicesPage() {
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
  if (!venue) return <main className="p-4">{t("errore.nessun_locale")}</main>;

  /*
   * Solo titolare e responsabile.
   *
   * L'elenco delle fatture porta importi, dati dei clienti e identificativi SDI. Con il solo controllo di appartenenza bastava essere del personale, e
   * la promessa "chi è in sala non vede gli incassi" era falsa.
   */
  if (venue.role !== "owner" && venue.role !== "manager") {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-lg font-semibold">{t("fattura.vietato.titolo")}</h1>
        <p className="mt-2 text-sm text-muted">{t("fattura.vietato.testo")}</p>
      </main>
    );
  }

  // Il modulo si verifica qui e non solo nel menu: chi digita
  // l'indirizzo la pagina la otterrebbe lo stesso.
  if (!(await moduloAttivo(venue.venueId, "ordini"))) {
    return <ModuloNonAttivo modulo="ordini" />;
  }

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
      ferma: boolean;
    }[]
  >`
    select i.id, i.invoice_number, i.status, i.provider_invoice_id,
           i.sdi_identifier, i.xml_url, i.customer_email, i.emailed_at, i.created_at,
           p.amount_cents, p.provider as payment_provider,
           -- Il confronto lo fa il database: leggere l'ora nel render darebbe
           -- due HTML diversi fra server e browser.
           (i.status = 'sent' and i.created_at < now() - interval '48 hours') as ferma
      from invoices i
      join payments p on p.id = i.payment_id
     where i.venue_id = ${venue.venueId}
     order by i.created_at desc`;

  return (
    <LinguaProvider lingua={lingua}>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">{t("fattura.occhiello")}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{t("fattura.titolo")}</h1>
            <p className="mt-1 text-sm text-muted">{t("fattura.sottotitolo")}</p>
          </div>
          <PrintButton />
        </div>

        {invoices.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            {t("fattura.vuoto")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("fattura.colonna.numero")}</th>
                  <th className="px-4 py-3 font-medium">{t("fattura.colonna.data")}</th>
                  <th className="px-4 py-3 font-medium">{t("fattura.colonna.importo")}</th>
                  <th className="px-4 py-3 font-medium">{t("fattura.colonna.stato")}</th>
                  <th className="px-4 py-3 font-medium">{t("fattura.colonna.identificativo")}</th>
                  <th className="px-4 py-3 font-medium">{t("fattura.colonna.documento")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-4 font-medium tabular-nums">
                      {invoice.invoice_number ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-muted">{t.data(invoice.created_at)}</td>
                    <td className="px-4 py-4 font-medium tabular-nums">
                      {t.prezzo(invoice.amount_cents)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${invoice.status === "rejected" ? "border-danger text-danger" : invoice.status === "delivered" ? "border-success text-success" : "border-border"}`}>
                        {STATUS[invoice.status] ?? invoice.status}
                      </span>
                      {/*
                        Lo SDI risponde in ore, non in giorni: una fattura ferma
                        su "inviata" da due giorni non è lenta, è una notifica
                        che non è mai arrivata — di solito perché il webhook non
                        è configurato. Senza questo avviso restava così per
                        sempre e nessuno la guardava più.
                      */}
                      {invoice.ferma && (
                        <span className="mt-1 block text-xs text-danger">
                          {t("fattura.ferma")}
                        </span>
                      )}
                    </td>
                    <td className="max-w-48 truncate px-4 py-4 font-mono text-xs text-muted">
                      {invoice.sdi_identifier ?? invoice.provider_invoice_id ?? t("fattura.in_attesa")}
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/dashboard/invoices/${invoice.id}`} className="underline underline-offset-2">
                        {t("fattura.dettagli")}
                      </Link>
                      {invoice.xml_url ? (
                        <>
                          {" · "}
                        <a href={invoice.xml_url} className="underline underline-offset-2" target="_blank" rel="noreferrer">
                          {t("fattura.apri_xml")}
                        </a>
                        </>
                      ) : (
                        <span className="ml-2 text-muted">{t("fattura.xml_invoicetronic")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </LinguaProvider>
  );
}
