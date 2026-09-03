import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { stripeClient } from "@/lib/stripe";
import { ConnectStripeButton } from "./connect-stripe-button";
import { saveInvoiceSettings } from "./invoice-actions";
import { SatispayForm } from "./satispay-form";
import { PasswordForm } from "./password-form";
import { TilbyForm } from "./tilby-form";
import { BrandForm } from "./brand-form";
import { PrenotazioniForm } from "./prenotazioni-form";
import { EmailForm } from "./email-form";
import { CopertoForm } from "./coperto-form";
import { TestiForm } from "./testi-form";
import { SogliaForm } from "./soglia-form";
import { OpenRouterForm } from "./openrouter-form";
import { AssistenteForm } from "./assistente-form";
import { emailConfigurata } from "@repo/shared/email";
import { AnnuncioForm } from "./annuncio-form";

export default async function SettingsPage() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  const sql = db();
  const [venueRow] = await sql<
    {
      name: string;
      logo_url: string | null;
      announcement_title: string | null;
      announcement_body: string | null;
      announcement_image_url: string | null;
      announcement_cta_label: string | null;
      announcement_cta_url: string | null;
      announcement_starts_at: Date | null;
      announcement_ends_at: Date | null;
      announcement_enabled: boolean;
      reservation_email: string | null;
      reservation_capacity: number | null;
      reservation_auto_confirm: boolean;
      resend_api_key: string | null;
      resend_from: string | null;
      cover_charge_cents: number;
      service_percent: string;
      cover_charge_label: string | null;
      soglia_attesa_min: number;
      public_texts: Record<string, string> | null;
      openrouter_api_key: string | null;
      openrouter_model: string | null;
      opening_hours: string | null;
      practical_info: string | null;
      assistant_enabled: boolean;
      brand_color: string | null;
      public_phone: string | null;
      public_email: string | null;
      tilby_shop_name: string | null;
      tips_enabled: boolean;
      tip_percents: number[] | null;
      google_review_url: string | null;
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
  >`select name, logo_url,
           announcement_title, announcement_body, announcement_image_url,
           announcement_cta_label, announcement_cta_url,
           announcement_starts_at, announcement_ends_at, announcement_enabled,
           reservation_email, reservation_capacity, reservation_auto_confirm,
           resend_api_key, resend_from,
           cover_charge_cents, service_percent, cover_charge_label, public_texts,
           soglia_attesa_min,
           openrouter_api_key, openrouter_model,
           opening_hours, practical_info, assistant_enabled, brand_color, public_phone, public_email,
           tilby_shop_name, tips_enabled, tip_percents, google_review_url,
           stripe_account_id, satispay_key_id, vat_number, fiscal_code, regime_fiscale,
           address, address_zip, address_city, address_province, invoice_provider_api_key
    from venues where id = ${venue.venueId}`;

  // Lo stato Stripe è un'informazione accessoria: se la chiamata fallisce
  // (chiave non configurata, Stripe irraggiungibile) la pagina deve restare
  // usabile, altrimenti un problema esterno chiude fuori il gestore da tutte
  // le impostazioni, comprese quelle che non c'entrano con i pagamenti.
  let chargesEnabled = false;
  let stripeStatusUnavailable = false;
  if (venueRow?.stripe_account_id) {
    try {
      const account = await stripeClient().accounts.retrieve(venueRow.stripe_account_id);
      chargesEnabled = account.charges_enabled;
    } catch (err) {
      console.error("[settings] stato account Stripe non recuperabile:", err);
      stripeStatusUnavailable = true;
    }
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
            tipsEnabled: venueRow?.tips_enabled ?? true,
            tipPercents: venueRow?.tip_percents ?? [5, 10, 15],
            googleReviewUrl: venueRow?.google_review_url ?? null,
          }}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">Annuncio ai clienti</h2>
        <p className="mb-3 text-sm text-muted">
          Compare all&apos;apertura del menu, sia al tavolo sia dalla pagina
          pubblica. Serve per il menu del giorno, una serata a tema o una
          chiusura straordinaria. Chi lo chiude non lo rivede, finché non ne
          pubblichi uno diverso.
        </p>
        <AnnuncioForm
          corrente={{
            title: venueRow?.announcement_title ?? null,
            body: venueRow?.announcement_body ?? null,
            image_url: venueRow?.announcement_image_url ?? null,
            cta_label: venueRow?.announcement_cta_label ?? null,
            cta_url: venueRow?.announcement_cta_url ?? null,
            starts_at: venueRow?.announcement_starts_at ?? null,
            ends_at: venueRow?.announcement_ends_at ?? null,
            enabled: venueRow?.announcement_enabled ?? false,
          }}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">Prenotazioni</h2>
        <p className="mb-3 text-sm text-muted">
          Regola come arrivano e come vengono accettate le richieste dalla tua
          pagina pubblica di prenotazione.
        </p>
        <PrenotazioniForm
          email={venueRow?.reservation_email ?? null}
          capienza={venueRow?.reservation_capacity ?? null}
          autoConfirm={venueRow?.reservation_auto_confirm ?? false}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">Orari e assistente</h2>
        <p className="mb-3 text-sm text-muted">
          Gli orari servono comunque. L&apos;assistente è facoltativo e a
          consumo: risponde ai clienti sulle pagine pubbliche e li porta a
          prenotare.
        </p>
        <AssistenteForm
          orari={venueRow?.opening_hours ?? null}
          info={venueRow?.practical_info ?? null}
          attivo={venueRow?.assistant_enabled ?? false}
          chiaveCollegata={Boolean(venueRow?.openrouter_api_key)}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">Schede vino da foto</h2>
        <p className="mb-3 text-sm text-muted">
          Fotografi l&apos;etichetta e la scheda si compila da sé. Quello che
          esce è una proposta da rileggere: in carta ci va quello che
          confermi tu.
        </p>
        <OpenRouterForm
          collegata={Boolean(venueRow?.openrouter_api_key)}
          modello={venueRow?.openrouter_model ?? null}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">Testi delle pagine pubbliche</h2>
        <p className="mb-3 text-sm text-muted">
          Piatti e prezzi li scrivi dal Menu. Qui riscrivi le frasi intorno:
          il titolo della pagina prenotazioni, la presentazione del locale, la
          nota in fondo alla carta.
        </p>
        <TestiForm
          testi={venueRow?.public_texts ?? {}}
          nomeLocale={venueRow?.name ?? "il tuo locale"}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">Allarme ritardi</h2>
        <p className="mb-3 text-sm text-muted">
          Quanto può aspettare un tavolo prima che tu voglia accorgertene.
        </p>
        <SogliaForm minuti={venueRow?.soglia_attesa_min ?? 20} />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">Coperto e servizio</h2>
        <p className="mb-3 text-sm text-muted">
          Se il tuo locale li applica, vanno dichiarati al cliente insieme ai
          prezzi dei piatti.
        </p>
        <CopertoForm
          copertoCents={venueRow?.cover_charge_cents ?? 0}
          servizio={Number(venueRow?.service_percent ?? 0)}
          etichetta={venueRow?.cover_charge_label ?? null}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">Email ai clienti</h2>
        <p className="mb-3 text-sm text-muted">
          Da quale indirizzo partono conferme e rifiuti delle prenotazioni.
        </p>
        <EmailForm
          collegato={Boolean(venueRow?.resend_api_key && venueRow?.resend_from)}
          from={venueRow?.resend_from ?? null}
          piattaformaAttiva={emailConfigurata()}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">Password</h2>
        <PasswordForm />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">Pagamenti (Stripe)</h2>
        {stripeStatusUnavailable ? (
          <p className="text-sm text-muted">
            Stato del collegamento non verificabile in questo momento. I pagamenti
            già attivi continuano a funzionare.
          </p>
        ) : chargesEnabled ? (
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
        <h2 className="mb-1 font-semibold">Gestionale di cassa (Tilby)</h2>
        <p className="mb-3 text-sm text-muted">
          Collegando la cassa puoi importare il menu che hai già, con prezzi e
          aliquote IVA corretti, senza reinserirlo a mano. Il token si ottiene
          aderendo al{" "}
          <a
            href="https://developer.tilby.com/docs"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Developer Program di Tilby
          </a>
          , che prevede approvazione e costi propri.
        </p>
        <TilbyForm shopName={venueRow?.tilby_shop_name ?? null} />
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
