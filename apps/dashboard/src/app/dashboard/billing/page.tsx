import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { isEntitled } from "@repo/shared";
import { PlanButtons } from "./plan-buttons";
import { linguaUtente } from "@/lib/lingua";
import { tSoldi } from "@/i18n/soldi";
import { LinguaProvider } from "@repo/shared/i18n/contesto";

export default async function BillingPage() {
  const session = await auth();
  const lingua = await linguaUtente();
  const t = tSoldi(lingua);


  // Le etichette dello stato: i valori a database restano none/trialing/…
  const STATO: Record<string, string> = {
    none: t("abbonamento.stato.none"),
    trialing: t("abbonamento.stato.trialing"),
    active: t("abbonamento.stato.active"),
    past_due: t("abbonamento.stato.past_due"),
    canceled: t("abbonamento.stato.canceled"),
    incomplete: t("abbonamento.stato.incomplete"),
    unpaid: t("abbonamento.stato.unpaid"),
  };

  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">{t("errore.nessun_locale")}</main>;

  if (venue.role !== "owner") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-5">
        <h1 className="mb-2 text-lg font-semibold">{t("abbonamento.titolo")}</h1>
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          {t("abbonamento.solo_titolare")}
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
      subscription_id: string | null;
      commissione_percent: string;
    }[]
  >`select subscription_status, subscription_plan, subscription_period_end,
           billing_customer_id, subscription_id, commissione_percent
      from venues where id = ${venue.venueId}`;

  /*
   * Quanto tratteniamo su questo locale, se tratteniamo qualcosa.
   *
   * Serve perché questa pagina diceva a tutti «noi non tratteniamo nulla sul
   * tuo incassato» mentre il codice ne prendeva l'1,5%. Il ristoratore lo
   * scopriva sul suo estratto conto Stripe: la voce c'era e la frase diceva
   * che non poteva esserci. Adesso la pagina legge il valore vero, e le due
   * frasi cambiano di conseguenza — su questo si può discutere il prezzo, non
   * il fatto che sia scritto.
   */
  const commissione = Number(row?.commissione_percent ?? 0);
  const trattenuta = Number.isFinite(commissione) && commissione > 0;

  const status = row?.subscription_status ?? "none";

  const INCLUSO = [
    t("abbonamento.incluso.menu"),
    t("abbonamento.incluso.ordine"),
    t("abbonamento.incluso.prenotazioni"),
    t("abbonamento.incluso.marchio"),
    t("abbonamento.incluso.fattura"),
    t("abbonamento.incluso.accessi"),
    trattenuta
      ? t("abbonamento.incluso.percentuale.si", { percent: String(commissione) })
      : t("abbonamento.incluso.percentuale"),
  ];

  const entitled = isEntitled(status, row?.subscription_period_end ?? null);
  const periodEnd = row?.subscription_period_end
    ? t.data(row.subscription_period_end, "lunga")
    : null;

  return (
    <LinguaProvider lingua={lingua}>
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        <h1 className="text-lg font-semibold">{t("abbonamento.titolo")}</h1>

        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">{STATO[status] ?? status}</p>
            {row?.subscription_plan && (
              <p className="text-sm text-muted">
                {t("abbonamento.piano", { piano: row.subscription_plan })}
              </p>
            )}
          </div>

          {periodEnd && (
            <p className="mt-1 text-sm text-muted">
              {status === "canceled"
                ? t("abbonamento.fino_al", { data: periodEnd })
                : status === "trialing"
                  ? t("abbonamento.prova_finisce", { data: periodEnd })
                  : t("abbonamento.rinnovo", { data: periodEnd })}
            </p>
          )}

          {status === "past_due" && (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {t("abbonamento.past_due")}
            </p>
          )}

          {!entitled && (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {t("abbonamento.non_attivo")}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          {/* Il portale si apre solo se un abbonamento esiste davvero: avere
              un Customer significa soltanto aver aperto il Checkout una volta,
              e chi si era fermato lì restava senza modo di sottoscrivere. */}
          <PlanButtons
            hasSubscription={Boolean(row?.subscription_id)}
            neverSubscribed={status === "none"}
          />
        </section>

        <section className="rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="mb-2 font-medium">{t("abbonamento.incluso.titolo")}</p>
          <ul className="space-y-1 text-muted">
            {INCLUSO.map((v) => (
              <li key={v}>— {v}</li>
            ))}
          </ul>
          <p className="mt-3 text-muted">
            {trattenuta
              ? t("abbonamento.iva.commissione", { percent: String(commissione) })
              : t("abbonamento.iva")}
          </p>
        </section>
      </main>
    </LinguaProvider>
  );
}
