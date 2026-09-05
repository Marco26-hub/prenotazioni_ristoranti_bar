import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";
import { BancoVivo, type OrdineBanco } from "./banco-vivo";

/**
 * Il banco: i numeri di ritiro, grandi.
 *
 * È la pagina che sta su uno schermo dietro il bancone, guardata da lontano
 * e in mezzo al rumore. Per questo i numeri sono enormi e i colori pochi:
 * chi aspetta deve capire dalla porta se tocca a lui.
 */
export default async function BancoPage() {
  const { venue } = await requireVenue();
  const sql = db();

  const [locale] = await sql<
    { pickup_numbering_enabled: boolean; pickup_metodi: string[] | null }[]
  >`select pickup_numbering_enabled, pickup_metodi
      from venues where id = ${venue.venueId}`;

  if (!locale?.pickup_numbering_enabled) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-5">
        <h1 className="text-xl font-semibold">Banco</h1>
        <p className="mt-3 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          I numeri di ritiro non sono attivi. Servono a chi consegna al
          bancone invece che al tavolo: si accendono in Impostazioni, insieme
          al modo di avvisare chi aspetta — segnaposto numerato, cercapersone
          o avviso sul telefono di chi ha ordinato.
        </p>
      </main>
    );
  }

  /*
   * La giornata in corso, più tutto quello che non è ancora stato consegnato.
   *
   * I numeri ripartono da uno a ogni giornata, e mostrare anche ieri
   * metterebbe due volte lo stesso numero sullo stesso schermo — il modo più
   * veloce di dare il panino alla persona sbagliata. Ma filtrare sulla sola
   * giornata di oggi faceva sparire, allo scoccare dell'ora di stacco, i
   * numeri ancora in mano a qualcuno: chi stava aspettando spariva dallo
   * schermo e la serie ripartiva sopra di lui. Quello che non è stato
   * ritirato resta finché non lo si chiude, con la sua giornata accanto se
   * è di ieri.
   */
  const ordini = await sql<
    {
      id: string;
      numero: number;
      chiamato: Date | null;
      ritirato: Date | null;
      pronte: number;
      totali: number;
      creato: Date;
      giornata: string;
      oggi: boolean;
    }[]
  >`
    select o.id, o.pickup_number as numero,
           o.pickup_chiamato_at as chiamato,
           o.pickup_ritirato_at as ritirato,
           count(*) filter (where oi.status in ('ready', 'served'))::int as pronte,
           count(*)::int as totali,
           o.created_at as creato,
           o.pickup_service_date::text as giornata,
           (o.pickup_service_date =
             ((now() at time zone coalesce(v.timezone, 'Europe/Rome'))
               - make_interval(hours => v.giornata_stacco_ora))::date) as oggi
      from orders o
      join order_items oi on oi.order_id = o.id
      join venues v on v.id = o.venue_id
     where o.venue_id = ${venue.venueId}
       and o.pickup_number is not null
       and o.status <> 'cancelled'
       and oi.status <> 'cancelled'
       and (
         o.pickup_service_date =
           ((now() at time zone coalesce(v.timezone, 'Europe/Rome'))
             - make_interval(hours => v.giornata_stacco_ora))::date
         or o.pickup_ritirato_at is null
       )
     group by o.id, o.pickup_number, o.pickup_chiamato_at,
              o.pickup_ritirato_at, o.created_at, o.pickup_service_date,
              -- Servono nel GROUP BY perché compaiono nella select dentro
              -- "oggi": raggruppare per o.id copre le colonne di orders,
              -- non quelle di venues. Senza, la query non è valida e la
              -- pagina risponde 500 a ogni caricamento.
              v.timezone, v.giornata_stacco_ora
     order by o.pickup_number`;

  const righe: OrdineBanco[] = ordini.map((o) => ({
    id: o.id,
    numero: o.numero,
    stato: o.ritirato
      ? "ritirato"
      : o.chiamato
        ? "chiamato"
        : o.totali > 0 && o.pronte === o.totali
          ? "pronto"
          : "in_preparazione",
    da: o.creato.toISOString(),
    // Rimasto da ieri: va detto, o si legge come un numero di stasera.
    diIeri: !o.oggi,
  }));

  return (
    <BancoVivo ordini={righe} metodi={locale.pickup_metodi ?? []} />
  );
}
