import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { SUBSCRIPTION_STATUS_LABEL, isEntitled } from "@repo/shared";
import { PlanButtons } from "./plan-buttons";

const INCLUSO = [
  "Menu digitale con QR per ogni tavolo",
  "Ordine e pagamento al tavolo, anche alla romana",
  "Prenotazioni e gestione sala",
  "Il tuo logo e i tuoi colori sulle pagine cliente",
  "Fattura elettronica richiedibile dal tavolo",
  "Accessi separati per titolare, sala e cucina",
  "Nessun costo di attivazione",
  "Nessuna commissione sui tuoi incassi",
];

function formatDate(d: Date | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(d);
}

export default async function BillingPage() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  if (venue.role !== "owner") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-5">
        <h1 className="mb-2 text-lg font-semibold">Abbonamento</h1>
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          Solo il titolare può gestire l&apos;abbonamento.
        </p>
      </main>
    );
  }

  const sql = db();
  const [row] = await sql<
    {
      subscription_status: string;
      subscription_plan: string | null;
      subscription_period_end: Date | null;
      billing_customer_id: string | null;
    }[]
  >`select subscription_status, subscription_plan, subscription_period_end,
           billing_customer_id
      from venues where id = ${venue.venueId}`;

  const status = row?.subscription_status ?? "none";
  const entitled = isEntitled(status, row?.subscription_period_end ?? null);
  const periodEnd = formatDate(row?.subscription_period_end ?? null);

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
      <h1 className="text-lg font-semibold">Abbonamento</h1>

      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold">
            {SUBSCRIPTION_STATUS_LABEL[status] ?? status}
          </p>
          {row?.subscription_plan && (
            <p className="text-sm text-muted">Piano {row.subscription_plan}</p>
          )}
        </div>

        {periodEnd && (
          <p className="mt-1 text-sm text-muted">
            {status === "canceled"
              ? `Il servizio resta attivo fino al ${periodEnd}.`
              : status === "trialing"
                ? `La prova gratuita finisce il ${periodEnd}.`
                : `Prossimo rinnovo il ${periodEnd}.`}
          </p>
        )}

        {status === "past_due" && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            L&apos;ultimo addebito non è andato a buon fine. Il servizio resta
            attivo ancora per qualche giorno: aggiorna il metodo di pagamento
            per non interrompere il lavoro in sala.
          </p>
        )}

        {!entitled && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Senza abbonamento attivo i tuoi clienti non possono ordinare né
            pagare dal tavolo.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <PlanButtons
          hasSubscription={Boolean(row?.billing_customer_id) && status !== "none"}
          neverSubscribed={status === "none"}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 text-sm">
        <p className="mb-2 font-medium">Cosa è incluso</p>
        <ul className="space-y-1 text-muted">
          {INCLUSO.map((v) => (
            <li key={v}>— {v}</li>
          ))}
        </ul>
        <p className="mt-3 text-muted">
          Prezzi IVA esclusa. Le commissioni sui pagamenti dei tuoi clienti
          sono quelle di Stripe e non passano da noi.
        </p>
      </section>
    </main>
  );
}
