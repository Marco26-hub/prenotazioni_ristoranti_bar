import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { stripeClient } from "@/lib/stripe";
import { ConnectStripeButton } from "./connect-stripe-button";
import { saveInvoiceSettings } from "./invoice-actions";

export default async function SettingsPage() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  const sql = db();
  const [venueRow] = await sql<
    {
      stripe_account_id: string | null;
      vat_number: string | null;
      fiscal_code: string | null;
      regime_fiscale: string | null;
      address: string | null;
      address_zip: string | null;
      address_city: string | null;
      address_province: string | null;
      invoice_provider_api_key: string | null;
    }[]
  >`select stripe_account_id, vat_number, fiscal_code, regime_fiscale, address,
           address_zip, address_city, address_province, invoice_provider_api_key
    from venues where id = ${venue.venueId}`;

  let chargesEnabled = false;
  if (venueRow?.stripe_account_id) {
    const account = await stripeClient().accounts.retrieve(venueRow.stripe_account_id);
    chargesEnabled = account.charges_enabled;
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-xl font-semibold">Impostazioni — {venue.venueName}</h1>

      <section className="rounded border p-4">
        <h2 className="mb-2 font-medium">Pagamenti (Stripe)</h2>
        {chargesEnabled ? (
          <p className="text-sm text-green-700">
            Attivo — i clienti possono pagare il conto dal telefono.
          </p>
        ) : venueRow?.stripe_account_id ? (
          <div className="space-y-2">
            <p className="text-sm text-amber-700">
              Onboarding iniziato ma non completato — mancano dati richiesti da Stripe.
            </p>
            <ConnectStripeButton label="Completa onboarding Stripe" />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Collega un account Stripe per accettare pagamenti al tavolo. Ti verranno
              chiesti dati dell&apos;attività e coordinate bancarie sulla pagina Stripe.
            </p>
            <ConnectStripeButton label="Connetti Stripe" />
          </div>
        )}
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-2 font-medium">Fatturazione elettronica (SDI)</h2>
        <p className="mb-3 text-sm text-gray-600">
          Serve un account{" "}
          <a href="https://invoicetronic.com" target="_blank" rel="noreferrer" className="underline">
            Invoicetronic
          </a>{" "}
          (o compatibile) con la sua API key. Verifica i dati fiscali con il tuo
          commercialista prima di attivare — qui gestiamo il caso di vendita
          standard (TD01) a privato o azienda.
        </p>
        <form action={saveInvoiceSettings} className="space-y-2">
          <input
            name="vatNumber"
            placeholder="Partita IVA (es. IT01234567891)"
            defaultValue={venueRow?.vat_number ?? ""}
            required
            className="w-full rounded border p-2"
          />
          <input
            name="fiscalCode"
            placeholder="Codice fiscale"
            defaultValue={venueRow?.fiscal_code ?? ""}
            required
            className="w-full rounded border p-2"
          />
          <select
            name="regimeFiscale"
            defaultValue={venueRow?.regime_fiscale ?? "RF01"}
            className="w-full rounded border p-2"
          >
            <option value="RF01">RF01 — Ordinario</option>
            <option value="RF19">RF19 — Forfettario</option>
          </select>
          <input
            name="address"
            placeholder="Indirizzo (via e numero civico)"
            defaultValue={venueRow?.address ?? ""}
            required
            className="w-full rounded border p-2"
          />
          <div className="flex gap-2">
            <input
              name="addressZip"
              placeholder="CAP"
              defaultValue={venueRow?.address_zip ?? ""}
              required
              className="w-24 rounded border p-2"
            />
            <input
              name="addressCity"
              placeholder="Comune"
              defaultValue={venueRow?.address_city ?? ""}
              required
              className="flex-1 rounded border p-2"
            />
            <input
              name="addressProvince"
              placeholder="Prov."
              maxLength={2}
              defaultValue={venueRow?.address_province ?? ""}
              required
              className="w-16 rounded border p-2"
            />
          </div>
          <input
            name="apiKey"
            type="password"
            placeholder={
              venueRow?.invoice_provider_api_key
                ? "API key già impostata — lascia vuoto per non cambiarla"
                : "API key Invoicetronic (ik_live_... o ik_test_...)"
            }
            className="w-full rounded border p-2"
          />
          <button type="submit" className="w-full rounded bg-black py-2 text-white">
            Salva dati fatturazione
          </button>
        </form>
      </section>
    </main>
  );
}
