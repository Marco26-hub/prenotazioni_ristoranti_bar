import Link from "next/link";
import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";

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

interface Passo {
  fatto: boolean;
  titolo: string;
  perche: string;
  dove: string;
  href: string;
}

export default async function AvvioPage() {
  const { venue } = await requireVenue();
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
      titolo: "I dati del locale",
      perche:
        "Partita IVA e indirizzo finiscono sulle pagine che vede il cliente e sulle fatture. Senza, il gestionale non può emettere niente.",
      dove: "Impostazioni",
      href: "/dashboard/settings",
    },
    {
      fatto: conteggi.piatti > 0,
      titolo: "Il menu",
      perche:
        "Caricalo a mano o importalo da un file o dalla cassa. Puoi partire da un modello: crea le categorie del tuo tipo di locale senza toccare quello che hai già.",
      dove: "Menu",
      href: "/dashboard/menu",
    },
    {
      fatto: conteggi.piatti > 0 && conteggi.senza_allergeni === 0,
      titolo: "Gli allergeni su ogni piatto",
      perche:
        conteggi.senza_allergeni > 0
          ? `${conteggi.senza_allergeni} ${conteggi.senza_allergeni === 1 ? "piatto è ancora scoperto" : "piatti sono ancora scoperti"}. Il Reg. UE 1169/2011 li vuole tutti, e la sanzione va da 3.000 a 24.000 euro.`
          : "Tutti coperti. È l'obbligo che fa prendere le multe più salate.",
      dove: "Menu",
      href: "/dashboard/menu",
    },
    {
      fatto: conteggi.tavoli > 0,
      titolo: "I tavoli e i loro QR",
      perche:
        "Un QR per tavolo, da mandare in tipografia con il PDF già impaginato. La sala si dispone trascinando i tavoli come pedine.",
      dove: "QR e tavoli",
      href: "/dashboard/tables",
    },
    {
      fatto: Boolean(v?.stripe_account_id || v?.satispay_key_id),
      titolo: "Come incassi",
      perche:
        "Collega Stripe o Satispay. Senza, il cliente ordina ma non può pagare dal telefono: si paga al banco come sempre.",
      dove: "Impostazioni",
      href: "/dashboard/settings",
    },
  ];

  /* --- Servono presto, non il primo giorno --------------------------- */
  const poi: Passo[] = [
    {
      fatto: conteggi.personale > 1,
      titolo: "Il personale",
      perche:
        "Ognuno con il suo accesso: sala, cucina, bar. Chi è in sala non vede gli incassi, e il codice operatore fa entrare in fretta dal tablet condiviso.",
      dove: "Personale",
      href: "/dashboard/staff",
    },
    {
      fatto: Boolean(v?.logo_url),
      titolo: "Logo e colori",
      perche:
        "Le pagine che vede il cliente portano il tuo marchio, non il nostro. Il nostro nome non compare mai.",
      dove: "Impostazioni",
      href: "/dashboard/settings",
    },
    {
      fatto: Boolean(v?.resend_from),
      titolo: "Le email ai clienti",
      perche:
        "Conferme di prenotazione, promemoria del giorno prima, fatture. Senza, non parte niente.",
      dove: "Impostazioni",
      href: "/dashboard/settings",
    },
    {
      fatto: v?.rt_attivo ?? false,
      titolo: "Il registratore telematico",
      perche:
        "Il gestionale incassa, il registratore certifica. Se non lo colleghi, in Corrispettivi trovi il riepilogo di giornata per metodo di pagamento, da battere in cassa.",
      dove: "Corrispettivi",
      href: "/dashboard/fiscale",
    },
  ];

  /* --- Solo se ti servono -------------------------------------------- */
  const facoltative = [
    {
      titolo: "Prenotazioni online",
      perche:
        "Una pagina da mettere sul tuo sito, con promemoria e disdetta automatici.",
      stato: v?.reservation_capacity ? "impostata" : "da impostare",
      href: "/dashboard/reservations",
    },
    {
      titolo: "Formula a prezzo fisso",
      perche:
        "All you can eat: si paga a persona e i piatti compresi non si sommano. Con l'attesa fra un'ordinazione e l'altra, se ti serve.",
      stato: v?.formula_attiva ? "attiva" : "spenta",
      href: "/dashboard/settings",
    },
    {
      titolo: "Numeri di ritiro al banco",
      perche:
        "Per chi consegna al bancone invece che al tavolo. Segnaposto, cercapersone o avviso sul telefono.",
      stato: v?.pickup_numbering_enabled ? "attivi" : "spenti",
      href: "/dashboard/settings",
    },
    {
      titolo: "Coperto e servizio",
      perche:
        "Se li applichi vanno dichiarati al cliente insieme ai prezzi: la legge li tratta come una voce di menu.",
      stato: v?.cover_charge_cents ? "impostato" : "nessuno",
      href: "/dashboard/settings",
    },
  ];

  const mancanti = perAprire.filter((p) => !p.fatto).length;
  const pronti = perAprire.length - mancanti;

  return (
    <main className="mx-auto max-w-3xl px-4 py-5">
      <h1 className="text-xl font-semibold">Primi passi</h1>
      <p className="mt-1 text-sm text-muted">
        {mancanti === 0
          ? conteggi.ordini > 0
            ? "Tutto pronto, e il primo ordine è già arrivato."
            : "Tutto pronto. Inquadra un QR da un telefono e prova a ordinare."
          : `${pronti} su ${perAprire.length}. Quello che manca è qui sotto, in ordine.`}
      </p>

      <section className="mt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Senza queste non si apre
        </h2>
        <ul className="mt-2 space-y-2">
          {perAprire.map((p) => (
            <Voce key={p.titolo} passo={p} />
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Poi, appena puoi
        </h2>
        <ul className="mt-2 space-y-2">
          {poi.map((p) => (
            <Voce key={p.titolo} passo={p} />
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Solo se ti servono
        </h2>
        <p className="mt-1 text-xs text-muted">
          Non dipendono dal tipo di locale: una piadineria può fare la formula
          del venerdì e un ristorante può consegnare al banco. Accendi quello
          che usi.
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

function Voce({ passo }: { passo: Passo }) {
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
              <span className="ml-2 text-xs font-normal text-success">fatto</span>
            )}
          </p>
          <p className="mt-0.5 text-sm text-muted">{passo.perche}</p>
          {!passo.fatto && (
            <Link
              href={passo.href}
              className="mt-1.5 inline-flex min-h-9 items-center text-sm font-medium underline underline-offset-4"
            >
              Vai a {passo.dove}
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}
