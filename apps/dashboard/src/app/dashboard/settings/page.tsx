import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { stripeClient } from "@/lib/stripe";
import { ConnectStripeButton } from "./connect-stripe-button";
import { saveInvoiceSettings } from "./invoice-actions";
import { SatispayForm } from "./satispay-form";
import { PasswordForm } from "./password-form";
import { BrandForm } from "./brand-form";

export default async function SettingsPage() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  const sql = db();
  const [venueRow] = await sql<
    {
      name: string;
      logo_url: string | null;
      brand_color: string | null;
      public_phone: string | null;
      public_email: string | null;
      stripe_account_id: string | null;
      satispay_key_id: string | null;
      vat_number: string | null;
      fiscal_code: string | null;
      regime_fiscale: string | null;
      address: string | null;
      address_zip: string | null;
      address_city: string | null;
      address_province: string | null;
      invoice_provider_api_key: string | null;
    }[]
  >`select name, logo_url, brand_color, public_phone, public_email,
           stripe_account_id, satispay_key_id, vat_number, fiscal_code, regime_fiscale,
           address, address_zip, address_city, address_province, invoice_provider_api_key
    from venues where id = ${venue.venueId}`;

  let chargesEnabled = false;
  if (venueRow?.stripe_account_id) {
    const account = await stripeClient().accounts.retrieve(venueRow.stripe_account_id);
    chargesEnabled = account.charges_enabled;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      <h1 className="text-lg font-semibold">Impostazioni — {venue.venueName}</h1>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">Il tuo marchio</h2>
        <p className="mb-3 text-sm text-muted">
          Logo, colore e contatti che i clienti vedono quando scansionano il QR.
        </p>
        <BrandForm
          defaults={{
            name: venueRow?.name ?? venue.venueName,
            logoUrl: venueRow?.logo_url ?? null,
            brandColor: venueRow?.brand_color ?? null,
            publicPhone: venueRow?.public_phone ?? null,
            publicEmail: venueRow?.public_email ?? null,
          }}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">Password</h2>
        <PasswordForm />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">Pagamenti (Stripe)</h2>
        {chargesEnabled ? (
          <p className="text-sm text-success">
            Attivo — i clienti possono pagare il conto dal telefono.
          </p>
        ) : venueRow?.stripe_account_id ? (
          <div className="space-y-2">
            <p className="text-sm text-accent">
              Onboarding iniziato ma non completato — mancano dati richiesti da Stripe.
            </p>
            <ConnectStripeButton label="Completa onboarding Stripe" />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted">
              Collega un account Stripe per accettare pagamenti al tavolo. Ti verranno
              chiesti dati dell&apos;attività e coordinate bancarie sulla pagina Stripe.
            </p>
            <ConnectStripeButton label="Connetti Stripe" />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">Pagamenti (Satispay)</h2>
        {venueRow?.satispay_key_id ? (
          <p className="text-sm text-success">Connesso.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted">
              Serve prima un{" "}
              <a
                href="https://business.satispay.com"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                account Satispay Business
              </a>{" "}
              attivato, con un negozio creato e un codice di attivazione generato
              dalla loro dashboard — incollalo qui sotto.
            </p>
            <SatispayForm />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">Fatturazione elettronica (SDI)</h2>
        <p className="mb-3 text-sm text-muted">
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
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <input
            name="fiscalCode"
            placeholder="Codice fiscale"
            defaultValue={venueRow?.fiscal_code ?? ""}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <select
            name="regimeFiscale"
            defaultValue={venueRow?.regime_fiscale ?? "RF01"}
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          >
            <option value="RF01">RF01 — Ordinario</option>
            <option value="RF19">RF19 — Forfettario</option>
          </select>
          <input
            name="address"
            placeholder="Indirizzo (via e numero civico)"
            defaultValue={venueRow?.address ?? ""}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <div className="flex gap-2">
            <input
              name="addressZip"
              placeholder="CAP"
              defaultValue={venueRow?.address_zip ?? ""}
              required
              className="min-h-11 w-24 rounded-lg border border-border bg-background px-3"
            />
            <input
              name="addressCity"
              placeholder="Comune"
              defaultValue={venueRow?.address_city ?? ""}
              required
              className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3"
            />
            <input
              name="addressProvince"
              placeholder="Prov."
              maxLength={2}
              defaultValue={venueRow?.address_province ?? ""}
              required
              className="min-h-11 w-16 rounded-lg border border-border bg-background px-2"
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
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <button type="submit" className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95">
            Salva dati fatturazione
          </button>
        </form>
      </section>
    </main>
  );
}
