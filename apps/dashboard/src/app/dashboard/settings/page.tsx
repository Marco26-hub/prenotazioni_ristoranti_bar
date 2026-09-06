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
import { FormulaForm } from "./formula-form";
import { RitiroForm } from "./ritiro-form";
import { TestiForm } from "./testi-form";
import { SogliaForm } from "./soglia-form";
import { SessioneForm } from "./sessione-form";
import { OpenRouterForm } from "./openrouter-form";
import { AssistenteForm } from "./assistente-form";
import { emailConfigurata } from "@repo/shared/email";
import { AnnuncioForm } from "./annuncio-form";
import { messaggioErrore } from "@repo/shared/errori";
import { LinguaProvider } from "@repo/shared/i18n/contesto";
import { normalizzaLinguaUI } from "@repo/shared/i18n";
import { linguaUtente } from "@/lib/lingua";
import { tImpostazioni } from "@/i18n/impostazioni";
import { LinguaForm } from "./lingua-form";

export default async function SettingsPage() {
  const session = await auth();
  const lingua = await linguaUtente();
  const t = tImpostazioni(lingua);
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">{t("pagina.nessun_locale")}</main>;

  /*
   * Solo titolare e responsabile.
   *
   * Qui stanno chiavi di pagamento, prezzi e dati fiscali, e ogni azione dietro i moduli rifiuta comunque chi non ha il ruolo: la pagina si apriva lo stesso e ogni Salva faceva crollare la schermata con un errore non gestito. Con il solo controllo di appartenenza bastava essere del personale, e
   * la promessa "chi è in sala non vede gli incassi" era falsa.
   */
  if (venue.role !== "owner" && venue.role !== "manager") {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-lg font-semibold">{t("pagina.negato.titolo")}</h1>
        <p className="mt-2 text-sm text-muted">{t("pagina.negato.testo")}</p>
      </main>
    );
  }

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
      service_vat_rate: string;
      ordine_intervallo_min: number;
      venue_type: string | null;
      formula_attiva: boolean;
      formula_predefinita: boolean;
      formula_pranzo_cents: number;
      formula_cena_cents: number;
      formula_ora_cena: string;
      formula_bambino_cents: number | null;
      formula_bambino_eta_max: number | null;
      formula_supplemento_cents: number;
      formula_nota: string | null;
      pickup_numbering_enabled: boolean;
      pickup_metodi: string[] | null;
      servizio_al_banco: boolean;
      cover_charge_label: string | null;
      soglia_attesa_min: number;
      soglia_liberazione_min: number;
      sessione_max_ore: number;
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
      lingua_predefinita: string | null;
    }[]
  >`select name, logo_url,
           announcement_title, announcement_body, announcement_image_url,
           announcement_cta_label, announcement_cta_url,
           announcement_starts_at, announcement_ends_at, announcement_enabled,
           reservation_email, reservation_capacity, reservation_auto_confirm,
           resend_api_key, resend_from,
           cover_charge_cents, service_percent, service_vat_rate,
           ordine_intervallo_min, venue_type,
           formula_attiva, formula_predefinita, formula_pranzo_cents,
           formula_cena_cents, formula_ora_cena::text as formula_ora_cena,
           formula_bambino_cents, formula_bambino_eta_max,
           formula_supplemento_cents, formula_nota,
           pickup_numbering_enabled, pickup_metodi, servizio_al_banco,
           cover_charge_label, public_texts,
           soglia_attesa_min, soglia_liberazione_min, sessione_max_ore,
           openrouter_api_key, openrouter_model,
           opening_hours, practical_info, assistant_enabled, brand_color, public_phone, public_email,
           tilby_shop_name, tips_enabled, tip_percents, google_review_url,
           stripe_account_id, satispay_key_id, vat_number, fiscal_code, regime_fiscale,
           address, address_zip, address_city, address_province, invoice_provider_api_key,
           lingua_predefinita
    from venues where id = ${venue.venueId}`;

  const [utenteRow] = await sql<{ lingua_ui: string | null }[]>`
    select lingua_ui from users where id = ${session.user.id}`;

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
      console.error(
        `[settings] stato account Stripe non recuperabile: ${messaggioErrore(err)}`
      );
      stripeStatusUnavailable = true;
    }
  }

  return (
    <LinguaProvider lingua={lingua}>
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      <h1 className="text-lg font-semibold">
        {t("pagina.titolo", { locale: venue.venueName })}
      </h1>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">{t("sezione.brand.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">{t("sezione.brand.testo")}</p>
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
        <h2 className="mb-1 font-semibold">{t("sezione.annuncio.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">{t("sezione.annuncio.testo")}</p>
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
        <h2 className="mb-1 font-semibold">{t("sezione.prenotazioni.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">{t("sezione.prenotazioni.testo")}</p>
        <PrenotazioniForm
          email={venueRow?.reservation_email ?? null}
          capienza={venueRow?.reservation_capacity ?? null}
          autoConfirm={venueRow?.reservation_auto_confirm ?? false}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">{t("sezione.assistente.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">{t("sezione.assistente.testo")}</p>
        <AssistenteForm
          orari={venueRow?.opening_hours ?? null}
          info={venueRow?.practical_info ?? null}
          attivo={venueRow?.assistant_enabled ?? false}
          chiaveCollegata={Boolean(venueRow?.openrouter_api_key)}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">{t("sezione.openrouter.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">{t("sezione.openrouter.testo")}</p>
        <OpenRouterForm
          collegata={Boolean(venueRow?.openrouter_api_key)}
          modello={venueRow?.openrouter_model ?? null}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">{t("sezione.testi.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">{t("sezione.testi.testo")}</p>
        <TestiForm
          testi={venueRow?.public_texts ?? {}}
          nomeLocale={venueRow?.name ?? t("testi.locale_generico")}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">{t("sezione.soglie.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">{t("sezione.soglie.testo")}</p>
        <SogliaForm
          minuti={venueRow?.soglia_attesa_min ?? 20}
          liberazione={venueRow?.soglia_liberazione_min ?? 15}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">{t("sezione.sessione.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">{t("sezione.sessione.testo")}</p>
        <SessioneForm ore={venueRow?.sessione_max_ore ?? 6} />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">{t("sezione.coperto.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">{t("sezione.coperto.testo")}</p>
        <CopertoForm
          copertoCents={venueRow?.cover_charge_cents ?? 0}
          servizio={Number(venueRow?.service_percent ?? 0)}
          ivaSupplementi={Number(venueRow?.service_vat_rate ?? 10)}
          intervallo={venueRow?.ordine_intervallo_min ?? 0}
          etichetta={venueRow?.cover_charge_label ?? null}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">{t("sezione.formula.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">{t("sezione.formula.testo")}</p>
        <FormulaForm
          attiva={venueRow?.formula_attiva ?? false}
          predefinita={venueRow?.formula_predefinita ?? true}
          pranzoCents={venueRow?.formula_pranzo_cents ?? 0}
          cenaCents={venueRow?.formula_cena_cents ?? 0}
          oraCena={venueRow?.formula_ora_cena ?? "17:00"}
          bambinoCents={venueRow?.formula_bambino_cents ?? null}
          etaMax={venueRow?.formula_bambino_eta_max ?? null}
          supplementoCents={venueRow?.formula_supplemento_cents ?? 0}
          nota={venueRow?.formula_nota ?? ""}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">{t("sezione.ritiro.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">{t("sezione.ritiro.testo")}</p>
        <RitiroForm
          attivo={venueRow?.pickup_numbering_enabled ?? false}
          metodi={venueRow?.pickup_metodi ?? []}
          alBanco={venueRow?.servizio_al_banco ?? false}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">{t("sezione.email.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">{t("sezione.email.testo")}</p>
        <EmailForm
          collegato={Boolean(venueRow?.resend_api_key && venueRow?.resend_from)}
          from={venueRow?.resend_from ?? null}
          piattaformaAttiva={emailConfigurata()}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">{t("sezione.password.titolo")}</h2>
        <PasswordForm />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">{t("sezione.stripe.titolo")}</h2>
        {stripeStatusUnavailable ? (
          <p className="text-sm text-muted">{t("stripe.stato_ignoto")}</p>
        ) : chargesEnabled ? (
          <p className="text-sm text-success">{t("stripe.attivo")}</p>
        ) : venueRow?.stripe_account_id ? (
          <div className="space-y-2">
            <p className="text-sm text-accent">{t("stripe.incompleto")}</p>
            <ConnectStripeButton label={t("stripe.completa")} />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted">{t("stripe.collega.testo")}</p>
            <ConnectStripeButton label={t("stripe.connetti")} />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">{t("sezione.satispay.titolo")}</h2>
        {venueRow?.satispay_key_id ? (
          <p className="text-sm text-success">{t("satispay.connesso")}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted">
              {t("satispay.serve.prima")}{" "}
              <a
                href="https://business.satispay.com"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {t("satispay.serve.link")}
              </a>{" "}
              {t("satispay.serve.dopo")}
            </p>
            <SatispayForm />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">{t("sezione.tilby.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">
          {t("tilby.intro.prima")}{" "}
          <a
            href="https://developer.tilby.com/docs"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {t("tilby.intro.link")}
          </a>
          {t("tilby.intro.dopo")}
        </p>
        <TilbyForm shopName={venueRow?.tilby_shop_name ?? null} />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold">{t("sezione.fattura.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">
          {t("fattura.serve.prima")}{" "}
          <a href="https://invoicetronic.com" target="_blank" rel="noreferrer" className="underline">
            Invoicetronic
          </a>{" "}
          {t("fattura.serve.dopo")}
        </p>
        <form action={saveInvoiceSettings} className="space-y-2">
          <input
            name="vatNumber"
            placeholder={t("fattura.piva.placeholder")}
            defaultValue={venueRow?.vat_number ?? ""}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <input
            name="fiscalCode"
            placeholder={t("fattura.cf.placeholder")}
            defaultValue={venueRow?.fiscal_code ?? ""}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <select
            name="regimeFiscale"
            defaultValue={venueRow?.regime_fiscale ?? "RF01"}
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          >
            <option value="RF01">{t("fattura.regime.ordinario")}</option>
            <option value="RF19">{t("fattura.regime.forfettario")}</option>
          </select>
          <input
            name="address"
            placeholder={t("fattura.indirizzo.placeholder")}
            defaultValue={venueRow?.address ?? ""}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <div className="flex gap-2">
            <input
              name="addressZip"
              placeholder={t("fattura.cap.placeholder")}
              defaultValue={venueRow?.address_zip ?? ""}
              required
              className="min-h-11 w-24 rounded-lg border border-border bg-background px-3"
            />
            <input
              name="addressCity"
              placeholder={t("fattura.comune.placeholder")}
              defaultValue={venueRow?.address_city ?? ""}
              required
              className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3"
            />
            <input
              name="addressProvince"
              placeholder={t("fattura.provincia.placeholder")}
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
                ? t("fattura.chiave.impostata")
                : t("fattura.chiave.placeholder")
            }
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <button type="submit" className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground active:scale-95">
            {t("fattura.salva")}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">{t("sezione.lingua.titolo")}</h2>
        <p className="mb-3 text-sm text-muted">{t("sezione.lingua.testo")}</p>
        <LinguaForm
          mia={normalizzaLinguaUI(utenteRow?.lingua_ui)}
          pubblica={normalizzaLinguaUI(venueRow?.lingua_predefinita) ?? "it"}
        />
      </section>
    </main>
    </LinguaProvider>
  );
}
