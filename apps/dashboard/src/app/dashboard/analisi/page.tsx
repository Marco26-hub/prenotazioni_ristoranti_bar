import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { StampaReport } from "./stampa-report";
import { moduloAttivo } from "@/lib/authz";
import { ModuloNonAttivo } from "../modulo-non-attivo";
import { linguaUtente } from "@/lib/lingua";
import { tAnalisi, type VociAnalisi } from "@/i18n/analisi";

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

const PERIODI = [{ giorni: 7 }, { giorni: 30 }, { giorni: 90 }];

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

/* I valori a database (card, apple_pay, cash…) non si traducono: si traduce
   l'etichetta che ci sta sopra. */
const METODO_CHIAVE: Record<string, Extract<keyof VociAnalisi, string>> = {
  card: "analisi.metodo.card",
  apple_pay: "analisi.metodo.apple_pay",
  google_pay: "analisi.metodo.google_pay",
  satispay: "analisi.metodo.satispay",
  cash: "analisi.metodo.cash",
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
  const t = tAnalisi(await linguaUtente());
  const sessione = await auth();
  const venue = sessione?.venues[0];
  if (!venue) return <main className="p-4">{t("errore.nessun_locale")}</main>;

  // Il modulo si verifica qui e non solo nel menu: chi digita
  // l'indirizzo la pagina la otterrebbe lo stesso.
  if (!(await moduloAttivo(venue.venueId, "ordini"))) {
    return <ModuloNonAttivo modulo="ordini" />;
  }

  if (venue.role !== "owner" && venue.role !== "manager") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-5">
        <h1 className="mb-2 text-lg font-semibold">{t("analisi.titolo")}</h1>
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          {t("analisi.solo_titolare")}
        </p>
      </main>
    );
  }

  const sp = await searchParams;
  const richiesti = Number(Array.isArray(sp.giorni) ? sp.giorni[0] : sp.giorni);
  const giorni = PERIODI.some((p) => p.giorni === richiesti) ? richiesti : 30;
  const etichettaPeriodo = t.n(giorni, "analisi.periodo.giorni");
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
     /*
      * Solo i tavoli che hanno davvero ordinato.
      *
      * Una sessione si apre inquadrando il QR, anche per curiosità, e dopo
      * sei ore si chiude da sola: entrava nelle analisi come un servizio a
      * incasso zero. Bastavano pochi QR inquadrati e non usati per abbassare
      * lo scontrino medio e i coperti, e la permanenza media diventava la
      * media fra un pranzo e una scansione durata dieci secondi.
      *
      * Un tavolo che ha ordinato e se n'è andato senza pagare resta contato:
      * quello è un servizio vero, ed è una perdita che si deve vedere.
      */
     where ts.venue_id = ${venue.venueId} and ts.status = 'closed'
       and exists (select 1 from orders o
                    where o.table_session_id = ts.id and o.status <> 'cancelled')
       and ts.closed_at >= ${da}`;

  const perGiorno = await sql<PerGiorno[]>`
    select date_trunc('day', ts.closed_at) as giorno,
           count(*)::int as sessioni,
           coalesce(sum(ts.guest_count), 0)::int as coperti,
           coalesce((select sum(p.amount_cents) from payments p
                      where p.table_session_id = ts.id and p.status = 'succeeded'), 0) as incasso
      from table_sessions ts
     where ts.venue_id = ${venue.venueId} and ts.status = 'closed'
       and exists (select 1 from orders o
                    where o.table_session_id = ts.id and o.status <> 'cancelled')
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
       and exists (select 1 from orders o
                    where o.table_session_id = ts.id and o.status <> 'cancelled')
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
          <h1 className="text-lg font-semibold">{t("analisi.titolo")}</h1>
          {/* In pagina il periodo si legge dal bottone acceso, ma su carta
              i bottoni non ci sono e il foglio direbbe solo "Analisi". */}
          <p className="hidden text-sm print:block">
            {t("analisi.stampa.riga", {
              locale: venueNome,
              periodo: etichettaPeriodo,
              data: t.data(new Date(), "lunga"),
            })}
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
              {t.n(p.giorni, "analisi.periodo.giorni")}
            </a>
          ))}
        </div>
      </div>

      {sessioni === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          {t("analisi.vuoto")}
        </p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Scheda
              titolo={t("analisi.scheda.incasso")}
              valore={t.prezzo(incasso)}
              nota={t.n(sessioni, "analisi.scheda.incasso.nota")}
            />
            <Scheda
              titolo={t("analisi.scheda.per_coperto")}
              valore={t.prezzo(perCoperto)}
              nota={t.n(coperti, "analisi.scheda.per_coperto.nota")}
            />
            <Scheda
              titolo={t("analisi.scheda.per_tavolo")}
              valore={t.prezzo(perTavolo)}
              nota={t("analisi.scheda.per_tavolo.nota", {
                persone: t.numero(coperti / sessioni, 1),
              })}
            />
            <Scheda
              titolo={t("analisi.scheda.piatti_per_persona")}
              valore={t.numero(piattiPerCoperto, 1)}
              nota={t.n(piatti, "analisi.scheda.piatti_per_persona.nota")}
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Scheda
              titolo={t("analisi.scheda.permanenza")}
              valore={
                durataMedia >= 60
                  ? t("analisi.durata.ore", {
                      ore: Math.floor(durataMedia / 60),
                      minuti: String(durataMedia % 60).padStart(2, "0"),
                    })
                  : t("analisi.durata.minuti", { n: durataMedia })
              }
              nota={t("analisi.scheda.permanenza.nota")}
            />
            <Scheda
              titolo={t("analisi.scheda.rotazione")}
              valore={
                giorniAggregati.size > 0
                  ? t.numero(sessioni / giorniAggregati.size, 1)
                  : t.numero(0, 0)
              }
              nota={t("analisi.scheda.rotazione.nota")}
            />
            <Scheda
              titolo={t("analisi.scheda.coperti_giorno")}
              valore={
                giorniAggregati.size > 0
                  ? t.numero(Math.round(coperti / giorniAggregati.size), 0)
                  : t.numero(0, 0)
              }
            />
            <Scheda
              titolo={t("analisi.scheda.prezzo_medio")}
              valore={piatti > 0 ? t.prezzo(Math.round(incasso / piatti)) : "—"}
            />
          </section>

          {/* --- Andamento giornaliero -------------------------------- */}
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-3 font-semibold">{t("analisi.giorni.titolo")}</h2>
            <ul className="space-y-2">
              {[...giorniAggregati.entries()].slice(0, 14).map(([giorno, d]) => (
                <li key={giorno} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span>{t.data(new Date(giorno), "media")}</span>
                    <span className="tabular-nums text-muted">
                      {t.n(d.n, "analisi.giorni.tavoli")} ·{" "}
                      {t.n(d.coperti, "analisi.giorni.coperti")} ·{" "}
                      <span className="font-medium text-foreground">
                        {t.prezzo(d.incasso)}
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
              <h2 className="mb-1 font-semibold">{t("analisi.piatti.titolo")}</h2>
              <p className="mb-3 text-xs text-muted">
                {t("analisi.piatti.sottotitolo")}
              </p>
              <ul className="space-y-1.5 text-sm">
                {perPiatto.map((p) => (
                  <li key={p.nome} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">{p.nome}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {t("analisi.piatti.pezzi", { n: p.pezzi })} ·{" "}
                      <span className="text-foreground">
                        {t.prezzo(Number(p.incasso))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* --- Metodi di pagamento ------------------------------ */}
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="mb-3 font-semibold">{t("analisi.metodi.titolo")}</h2>
              <ul className="space-y-1.5 text-sm">
                {perMetodo.map((m) => (
                  <li key={m.method} className="flex items-baseline justify-between gap-3">
                    <span>
                      {METODO_CHIAVE[m.method] ? t(METODO_CHIAVE[m.method]) : m.method}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {t.n(m.n, "analisi.metodi.pagamenti")} ·{" "}
                      <span className="text-foreground">
                        {t.prezzo(Number(m.totale))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* --- Fasce orarie ---------------------------------------- */}
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-1 font-semibold">{t("analisi.orari.titolo")}</h2>
            {sessioni < MIN_SESSIONI_PER_ORARI ? (
              <p className="text-sm text-muted">
                {t("analisi.orari.pochi_dati", {
                  minimo: MIN_SESSIONI_PER_ORARI,
                  n: sessioni,
                })}
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted">
                  {t("analisi.orari.sottotitolo")}
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
                        title={t("analisi.orari.barra", {
                          ora: o.ora,
                          tavoli: t.n(o.sessioni, "analisi.giorni.tavoli"),
                        })}
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

          <p className="text-xs text-muted">{t("analisi.nota.coperti")}</p>
        </>
      )}
    </main>
  );
}
