import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { StampaReport } from "./stampa-report";
import { formatPriceCents } from "@repo/shared";

/**
 * Analisi dell'attività.
 *
 * Solo numeri che il locale può usare per decidere qualcosa: quanto spende
 * una persona, quanti piatti ordina, quanto resta seduta, cosa vende e cosa
 * no. I totali di cassa da soli non fanno cambiare nulla.
 *
 * Riservata a titolare e responsabile: sono dati economici.
 */

/**
 * Sotto questa soglia il grafico orario non dice nulla: due barre alla
 * stessa altezza sembrano un dato e non lo sono. Meglio dichiarare che
 * servono più servizi che disegnare una forma casuale.
 */
const MIN_SESSIONI_PER_ORARI = 20;

const PERIODI = [
  { giorni: 7, etichetta: "7 giorni" },
  { giorni: 30, etichetta: "30 giorni" },
  { giorni: 90, etichetta: "90 giorni" },
];

interface Riepilogo {
  sessioni: number;
  coperti: number;
  incasso: string | null;
  piatti: number;
  durata_media_min: number | null;
}

interface PerGiorno {
  giorno: Date;
  sessioni: number;
  coperti: number;
  incasso: string;
}

interface PerMetodo {
  method: string;
  n: number;
  totale: string;
}

interface PerPiatto {
  nome: string;
  pezzi: number;
  incasso: string;
}

interface PerOra {
  ora: number;
  sessioni: number;
}

const METODO_ETICHETTA: Record<string, string> = {
  card: "Carta",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  satispay: "Satispay",
  cash: "Contanti / al banco",
};

function Scheda({
  titolo,
  valore,
  nota,
}: {
  titolo: string;
  valore: string;
  nota?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{titolo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valore}</p>
      {nota && <p className="mt-1 text-xs text-muted">{nota}</p>}
    </div>
  );
}

export default async function AnalisiPage({
  searchParams,
}: PageProps<"/dashboard/analisi">) {
  const sessione = await auth();
  const venue = sessione?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  if (venue.role !== "owner" && venue.role !== "manager") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-5">
        <h1 className="mb-2 text-lg font-semibold">Analisi</h1>
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          Solo il titolare e il responsabile vedono i dati economici.
        </p>
      </main>
    );
  }

  const sp = await searchParams;
  const richiesti = Number(Array.isArray(sp.giorni) ? sp.giorni[0] : sp.giorni);
  const giorni = PERIODI.some((p) => p.giorni === richiesti) ? richiesti : 30;
  const etichettaPeriodo =
    PERIODI.find((p) => p.giorni === giorni)?.etichetta ?? `${giorni} giorni`;
  const venueNome = venue.venueName;

  const sql = db();
  const da = sql`now() - (${giorni} || ' days')::interval`;

  // Solo sessioni chiuse: un tavolo ancora seduto falserebbe sia la durata
  // media sia lo scontrino medio, perché non ha finito di ordinare.
  const [riepilogo] = await sql<Riepilogo[]>`
    select count(*)::int as sessioni,
           coalesce(sum(ts.guest_count), 0)::int as coperti,
           (select sum(p.amount_cents) from payments p
             join table_sessions t2 on t2.id = p.table_session_id
            where t2.venue_id = ${venue.venueId} and p.status = 'succeeded'
              and t2.status = 'closed' and t2.closed_at >= ${da}) as incasso,
           (select coalesce(sum(oi.quantity), 0)::int
              from order_items oi
              join orders o on o.id = oi.order_id
              join table_sessions t3 on t3.id = o.table_session_id
             where t3.venue_id = ${venue.venueId} and t3.status = 'closed'
               and t3.closed_at >= ${da}
               and o.status != 'cancelled' and oi.status != 'cancelled') as piatti,
           avg(extract(epoch from (ts.closed_at - ts.opened_at)) / 60) as durata_media_min
      from table_sessions ts
     where ts.venue_id = ${venue.venueId} and ts.status = 'closed'
       and ts.closed_at >= ${da}`;

  const perGiorno = await sql<PerGiorno[]>`
    select date_trunc('day', ts.closed_at) as giorno,
           count(*)::int as sessioni,
           coalesce(sum(ts.guest_count), 0)::int as coperti,
           coalesce((select sum(p.amount_cents) from payments p
                      where p.table_session_id = ts.id and p.status = 'succeeded'), 0) as incasso
      from table_sessions ts
     where ts.venue_id = ${venue.venueId} and ts.status = 'closed'
       and ts.closed_at >= ${da}
     group by 1, ts.id
     order by 1 desc`;

  const perMetodo = await sql<PerMetodo[]>`
    select p.method, count(*)::int as n, sum(p.amount_cents) as totale
      from payments p
      join table_sessions ts on ts.id = p.table_session_id
     where ts.venue_id = ${venue.venueId} and p.status = 'succeeded'
       and ts.closed_at >= ${da}
     group by p.method
     order by sum(p.amount_cents) desc`;

  const perPiatto = await sql<PerPiatto[]>`
    select mi.name as nome,
           sum(oi.quantity)::int as pezzi,
           sum(oi.quantity * oi.unit_price_cents) as incasso
      from order_items oi
      join orders o on o.id = oi.order_id
      join table_sessions ts on ts.id = o.table_session_id
      join menu_items mi on mi.id = oi.menu_item_id
     where ts.venue_id = ${venue.venueId} and ts.status = 'closed'
       and ts.closed_at >= ${da}
       and o.status != 'cancelled' and oi.status != 'cancelled'
     group by mi.name
     order by pezzi desc
     limit 12`;

  const perOra = await sql<PerOra[]>`
    select extract(hour from ts.opened_at)::int as ora, count(*)::int as sessioni
      from table_sessions ts
     where ts.venue_id = ${venue.venueId} and ts.opened_at >= ${da}
     group by 1 order by 1`;

  const coperti = riepilogo?.coperti ?? 0;
  const incasso = Number(riepilogo?.incasso ?? 0);
  const piatti = riepilogo?.piatti ?? 0;
  const sessioni = riepilogo?.sessioni ?? 0;

  const perCoperto = coperti > 0 ? Math.round(incasso / coperti) : 0;
  const perTavolo = sessioni > 0 ? Math.round(incasso / sessioni) : 0;
  const piattiPerCoperto = coperti > 0 ? piatti / coperti : 0;
  const durataMedia = riepilogo?.durata_media_min
    ? Math.round(Number(riepilogo.durata_media_min))
    : 0;

  const piccoOra = perOra.length ? Math.max(...perOra.map((o) => o.sessioni)) : 0;

  // Dalle 11 alle 24: è l'arco in cui un locale serve. Mostrare solo le ore
  // con dati fa sembrare vicine due fasce lontane fra loro.
  const conteggioPerOra = new Map(perOra.map((o) => [o.ora, o.sessioni]));
  const orarioCompleto = Array.from({ length: 14 }, (_, i) => ({
    ora: 11 + i,
    sessioni: conteggioPerOra.get(11 + i) ?? 0,
  }));

  const giorniAggregati = new Map<string, { coperti: number; incasso: number; n: number }>();
  for (const g of perGiorno) {
    const k = g.giorno.toISOString().slice(0, 10);
    const acc = giorniAggregati.get(k) ?? { coperti: 0, incasso: 0, n: 0 };
    acc.coperti += g.coperti;
    acc.incasso += Number(g.incasso);
    acc.n += g.sessioni;
    giorniAggregati.set(k, acc);
  }

  // Il picco va preso DOPO l'aggregazione. Prendendolo dalle righe singole,
  // un giorno con più righe sommava oltre il massimo, la larghezza superava
  // il 100% e la barra usciva dal riquadro fin sopra la navigazione.
  const piccoGiorno = Math.max(
    0,
    ...[...giorniAggregati.values()].map((d) => d.incasso)
  );

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Analisi</h1>
          {/* In pagina il periodo si legge dal bottone acceso, ma su carta
              i bottoni non ci sono e il foglio direbbe solo "Analisi". */}
          <p className="hidden text-sm print:block">
            {venueNome} · {etichettaPeriodo} · stampato il{" "}
            {new Intl.DateTimeFormat("it-IT", {
              dateStyle: "long",
            }).format(new Date())}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <StampaReport />
        </div>
        <div className="flex gap-1 print:hidden">
          {PERIODI.map((p) => (
            <a
              key={p.giorni}
              href={`/dashboard/analisi?giorni=${p.giorni}`}
              className={`flex min-h-11 items-center rounded-full px-3 text-sm ${
                p.giorni === giorni
                  ? "bg-accent text-accent-foreground"
                  : "border border-border text-muted"
              }`}
            >
              {p.etichetta}
            </a>
          ))}
        </div>
      </div>

      {sessioni === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Nessun tavolo chiuso in questo periodo. I numeri compaiono man mano
          che si chiudono i conti.
        </p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Scheda
              titolo="Incasso"
              valore={formatPriceCents(incasso)}
              nota={`${sessioni} tavoli serviti`}
            />
            <Scheda
              titolo="Spesa per coperto"
              valore={formatPriceCents(perCoperto)}
              nota={`${coperti} coperti in totale`}
            />
            <Scheda
              titolo="Spesa per tavolo"
              valore={formatPriceCents(perTavolo)}
              nota={`${(coperti / sessioni).toFixed(1)} persone a tavolo`}
            />
            <Scheda
              titolo="Piatti per persona"
              valore={piattiPerCoperto.toFixed(1)}
              nota={`${piatti} piatti in totale`}
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Scheda
              titolo="Permanenza media"
              valore={
                durataMedia >= 60
                  ? `${Math.floor(durataMedia / 60)}h ${String(durataMedia % 60).padStart(2, "0")}`
                  : `${durataMedia} min`
              }
              nota="Dall'apertura alla chiusura del conto"
            />
            <Scheda
              titolo="Rotazione tavoli"
              valore={
                giorniAggregati.size > 0
                  ? (sessioni / giorniAggregati.size).toFixed(1)
                  : "0"
              }
              nota="Tavoli serviti al giorno"
            />
            <Scheda
              titolo="Coperti al giorno"
              valore={
                giorniAggregati.size > 0
                  ? Math.round(coperti / giorniAggregati.size).toString()
                  : "0"
              }
            />
            <Scheda
              titolo="Prezzo medio del piatto"
              valore={piatti > 0 ? formatPriceCents(Math.round(incasso / piatti)) : "—"}
            />
          </section>

          {/* --- Andamento giornaliero -------------------------------- */}
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-3 font-semibold">Giorno per giorno</h2>
            <ul className="space-y-2">
              {[...giorniAggregati.entries()].slice(0, 14).map(([giorno, d]) => (
                <li key={giorno} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span>
                      {new Intl.DateTimeFormat("it-IT", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      }).format(new Date(giorno))}
                    </span>
                    <span className="tabular-nums text-muted">
                      {d.n} tavoli · {d.coperti} coperti ·{" "}
                      <span className="font-medium text-foreground">
                        {formatPriceCents(d.incasso)}
                      </span>
                    </span>
                  </div>
                  {/* Il contenitore taglia comunque: se un domani il calcolo
                      sbaglia di nuovo, la barra si ferma qui invece di
                      dipingere sopra il resto della pagina. */}
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${
                          piccoGiorno > 0
                            ? Math.min(100, Math.max(2, (d.incasso / piccoGiorno) * 100))
                            : 2
                        }%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* --- Piatti ------------------------------------------- */}
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="mb-1 font-semibold">Cosa vende</h2>
              <p className="mb-3 text-xs text-muted">
                I dodici più ordinati. Quello che non compare qui, e che è a
                menu da mesi, probabilmente non serve.
              </p>
              <ul className="space-y-1.5 text-sm">
                {perPiatto.map((p) => (
                  <li key={p.nome} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">{p.nome}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {p.pezzi} {p.pezzi === 1 ? "pz" : "pz"} ·{" "}
                      <span className="text-foreground">
                        {formatPriceCents(Number(p.incasso))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* --- Metodi di pagamento ------------------------------ */}
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="mb-3 font-semibold">Come pagano</h2>
              <ul className="space-y-1.5 text-sm">
                {perMetodo.map((m) => (
                  <li key={m.method} className="flex items-baseline justify-between gap-3">
                    <span>{METODO_ETICHETTA[m.method] ?? m.method}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {m.n} {m.n === 1 ? "pagamento" : "pagamenti"} ·{" "}
                      <span className="text-foreground">
                        {formatPriceCents(Number(m.totale))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* --- Fasce orarie ---------------------------------------- */}
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-1 font-semibold">A che ora si riempie</h2>
            {sessioni < MIN_SESSIONI_PER_ORARI ? (
              <p className="text-sm text-muted">
                Servono almeno {MIN_SESSIONI_PER_ORARI} tavoli chiusi perché
                questo dato voglia dire qualcosa: al momento sono {sessioni}.
                Con pochi servizi il grafico mostrerebbe il caso, non
                l&apos;andamento del locale.
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted">
                  Ora di apertura del tavolo, sull&apos;intero arco della
                  giornata: le ore vuote restano vuote, così la forma si legge.
                </p>
                <ul className="flex items-end gap-0.5">
                  {orarioCompleto.map((o) => (
                    <li key={o.ora} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] tabular-nums text-muted">
                        {o.sessioni > 0 ? o.sessioni : ""}
                      </span>
                      <div
                        className={`w-full rounded-t ${o.sessioni > 0 ? "bg-accent" : "bg-border"}`}
                        style={{
                          height: `${piccoOra > 0 ? Math.max(3, (o.sessioni / piccoOra) * 70) : 3}px`,
                        }}
                        title={`${o.ora}:00 — ${o.sessioni} tavoli`}
                      />
                      <span className="text-[10px] tabular-nums text-muted">
                        {o.ora % 2 === 0 ? o.ora : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <p className="text-xs text-muted">
            I coperti sono quelli indicati dallo staff sulla scheda del tavolo.
            Dove non sono stati indicati vale 1, e la spesa per coperto risulta
            più alta del vero.
          </p>
        </>
      )}
    </main>
  );
}
