import Link from "next/link";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";
import { linguaUtente } from "@/lib/lingua";
import { tAnalisi } from "@/i18n/analisi";

/**
 * Cosa manca per aprire.
 *
 * Le impostazioni sono cresciute a dodici sezioni, e chi apre il gestionale
 * il primo giorno non ha modo di sapere quali lo riguardano: le guarda tutte,
 * ne configura tre a caso e apre senza allergeni. Questa pagina non aggiunge
 * niente — legge lo stato vero e dice cosa serve, in che ordine, e cosa può
 * aspettare.
 *
 * Le voci "per aprire" sono quelle senza le quali il servizio non parte o si
 * prende una multa. Le altre stanno sotto, e sotto restano.
 */

type Traduttore = ReturnType<typeof tAnalisi>;

interface Passo {
  fatto: boolean;
  titolo: string;
  perche: string;
  dove: string;
  href: string;
}

export default async function AvvioPage() {
  const { venue } = await requireVenue();
  const t = tAnalisi(await linguaUtente());
  const sql = db();

  const [v] = await sql<
    {
      name: string;
      vat_number: string | null;
      fiscal_code: string | null;
      address_city: string | null;
      public_email: string | null;
      public_phone: string | null;
      logo_url: string | null;
      stripe_account_id: string | null;
      satispay_key_id: string | null;
      cover_charge_cents: number;
      rt_attivo: boolean;
      formula_attiva: boolean;
      pickup_numbering_enabled: boolean;
      resend_from: string | null;
      reservation_capacity: number | null;
    }[]
  >`select name, vat_number, fiscal_code, address_city, public_email,
           public_phone, logo_url, stripe_account_id, satispay_key_id,
           cover_charge_cents, rt_attivo, formula_attiva,
           pickup_numbering_enabled, resend_from, reservation_capacity
      from venues where id = ${venue.venueId}`;

  const [conteggi] = await sql<
    {
      tavoli: number;
      piatti: number;
      senza_allergeni: number;
      personale: number;
      ordini: number;
    }[]
  >`select
      (select count(*)::int from tables where venue_id = ${venue.venueId} and active) as tavoli,
      (select count(*)::int from menu_items where venue_id = ${venue.venueId}) as piatti,
      (select count(*)::int from menu_items
        where venue_id = ${venue.venueId}
          and (allergens is null or cardinality(allergens) = 0)) as senza_allergeni,
      (select count(*)::int from venue_staff where venue_id = ${venue.venueId}) as personale,
      (select count(*)::int from orders where venue_id = ${venue.venueId}) as ordini`;

  /* --- Senza queste non si apre ------------------------------------- */
  const perAprire: Passo[] = [
    {
      fatto: Boolean(v?.vat_number || v?.fiscal_code) && Boolean(v?.address_city),
      titolo: t("avvio.passo.dati.titolo"),
      perche: t("avvio.passo.dati.perche"),
      dove: t("avvio.dove.impostazioni"),
      href: "/dashboard/settings",
    },
    {
      fatto: conteggi.piatti > 0,
      titolo: t("avvio.passo.menu.titolo"),
      perche: t("avvio.passo.menu.perche"),
      dove: t("avvio.dove.menu"),
      href: "/dashboard/menu",
    },
    {
      fatto: conteggi.piatti > 0 && conteggi.senza_allergeni === 0,
      titolo: t("avvio.passo.allergeni.titolo"),
      perche:
        conteggi.senza_allergeni > 0
          ? t.n(conteggi.senza_allergeni, "avvio.passo.allergeni.scoperti")
          : t("avvio.passo.allergeni.coperti"),
      dove: t("avvio.dove.menu"),
      href: "/dashboard/menu",
    },
    {
      fatto: conteggi.tavoli > 0,
      titolo: t("avvio.passo.tavoli.titolo"),
      perche: t("avvio.passo.tavoli.perche"),
      dove: t("avvio.dove.tavoli"),
      href: "/dashboard/tables",
    },
    {
      fatto: Boolean(v?.stripe_account_id || v?.satispay_key_id),
      titolo: t("avvio.passo.incassi.titolo"),
      perche: t("avvio.passo.incassi.perche"),
      dove: t("avvio.dove.impostazioni"),
      href: "/dashboard/settings",
    },
  ];

  /* --- Servono presto, non il primo giorno --------------------------- */
  const poi: Passo[] = [
    {
      fatto: conteggi.personale > 1,
      titolo: t("avvio.passo.personale.titolo"),
      perche: t("avvio.passo.personale.perche"),
      dove: t("avvio.dove.personale"),
      href: "/dashboard/staff",
    },
    {
      fatto: Boolean(v?.logo_url),
      titolo: t("avvio.passo.logo.titolo"),
      perche: t("avvio.passo.logo.perche"),
      dove: t("avvio.dove.impostazioni"),
      href: "/dashboard/settings",
    },
    {
      fatto: Boolean(v?.resend_from),
      titolo: t("avvio.passo.email.titolo"),
      perche: t("avvio.passo.email.perche"),
      dove: t("avvio.dove.impostazioni"),
      href: "/dashboard/settings",
    },
    {
      fatto: v?.rt_attivo ?? false,
      titolo: t("avvio.passo.rt.titolo"),
      perche: t("avvio.passo.rt.perche"),
      dove: t("avvio.dove.corrispettivi"),
      href: "/dashboard/fiscale",
    },
  ];

  /* --- Solo se ti servono -------------------------------------------- */
  const facoltative = [
    {
      titolo: t("avvio.opzione.prenotazioni.titolo"),
      perche: t("avvio.opzione.prenotazioni.perche"),
      stato: v?.reservation_capacity
        ? t("avvio.stato.impostata")
        : t("avvio.stato.da_impostare"),
      href: "/dashboard/reservations",
    },
    {
      titolo: t("avvio.opzione.formula.titolo"),
      perche: t("avvio.opzione.formula.perche"),
      stato: v?.formula_attiva ? t("avvio.stato.attiva") : t("avvio.stato.spenta"),
      href: "/dashboard/settings",
    },
    {
      titolo: t("avvio.opzione.ritiro.titolo"),
      perche: t("avvio.opzione.ritiro.perche"),
      stato: v?.pickup_numbering_enabled
        ? t("avvio.stato.attivi")
        : t("avvio.stato.spenti"),
      href: "/dashboard/settings",
    },
    {
      titolo: t("avvio.opzione.coperto.titolo"),
      perche: t("avvio.opzione.coperto.perche"),
      stato: v?.cover_charge_cents
        ? t("avvio.stato.impostato")
        : t("avvio.stato.nessuno"),
      href: "/dashboard/settings",
    },
  ];

  const mancanti = perAprire.filter((p) => !p.fatto).length;
  const pronti = perAprire.length - mancanti;

  return (
    <main className="mx-auto max-w-3xl px-4 py-5">
      <h1 className="text-xl font-semibold">{t("avvio.titolo")}</h1>
      <p className="mt-1 text-sm text-muted">
        {mancanti === 0
          ? conteggi.ordini > 0
            ? t("avvio.pronto_con_ordini")
            : t("avvio.pronto")
          : t("avvio.avanzamento", { fatti: pronti, totale: perAprire.length })}
      </p>

      <section className="mt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t("avvio.sezione.per_aprire")}
        </h2>
        <ul className="mt-2 space-y-2">
          {perAprire.map((p) => (
            <Voce key={p.titolo} passo={p} t={t} />
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t("avvio.sezione.poi")}
        </h2>
        <ul className="mt-2 space-y-2">
          {poi.map((p) => (
            <Voce key={p.titolo} passo={p} t={t} />
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t("avvio.sezione.facoltative")}
        </h2>
        <p className="mt-1 text-xs text-muted">
          {t("avvio.sezione.facoltative.nota")}
        </p>
        <ul className="mt-2 space-y-2">
          {facoltative.map((f) => (
            <li
              key={f.titolo}
              className="rounded-xl border border-border bg-surface p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={f.href}
                  className="font-medium underline underline-offset-4"
                >
                  {f.titolo}
                </Link>
                <span className="text-xs text-muted">{f.stato}</span>
              </div>
              <p className="mt-0.5 text-sm text-muted">{f.perche}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Voce({ passo, t }: { passo: Passo; t: Traduttore }) {
  return (
    <li
      className={`rounded-xl border p-3 ${
        passo.fatto ? "border-border bg-surface" : "border-accent bg-accent/5"
      }`}
    >
      <div className="flex gap-3">
        <span
          aria-hidden
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm ${
            passo.fatto
              ? "bg-success text-white"
              : "border border-accent text-accent"
          }`}
        >
          {passo.fatto ? "✓" : "·"}
        </span>
        <div className="min-w-0">
          <p className="font-medium">
            {passo.titolo}
            {passo.fatto && (
              <span className="ml-2 text-xs font-normal text-success">
                {t("avvio.voce.fatto")}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm text-muted">{passo.perche}</p>
          {!passo.fatto && (
            <Link
              href={passo.href}
              className="mt-1.5 inline-flex min-h-9 items-center text-sm font-medium underline underline-offset-4"
            >
              {t("avvio.voce.vai", { dove: passo.dove })}
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}
