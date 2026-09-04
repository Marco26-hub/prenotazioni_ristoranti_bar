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
   * Solo la giornata di servizio in corso.
   *
   * I numeri ripartono da uno a ogni giornata: mostrare anche ieri metterebbe
   * due volte lo stesso numero sullo stesso schermo, che è il modo più
   * veloce di consegnare il panino alla persona sbagliata.
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
    }[]
  >`
    select o.id, o.pickup_number as numero,
           o.pickup_chiamato_at as chiamato,
           o.pickup_ritirato_at as ritirato,
           count(*) filter (where oi.status in ('ready', 'served'))::int as pronte,
           count(*)::int as totali,
           o.created_at as creato
      from orders o
      join order_items oi on oi.order_id = o.id
      join venues v on v.id = o.venue_id
     where o.venue_id = ${venue.venueId}
       and o.pickup_number is not null
       and o.status <> 'cancelled'
       and oi.status <> 'cancelled'
       and o.pickup_service_date =
           ((now() at time zone coalesce(v.timezone, 'Europe/Rome'))
             - interval '5 hours')::date
     group by o.id, o.pickup_number, o.pickup_chiamato_at,
              o.pickup_ritirato_at, o.created_at
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
  }));

  return (
    <BancoVivo ordini={righe} metodi={locale.pickup_metodi ?? []} />
  );
}
