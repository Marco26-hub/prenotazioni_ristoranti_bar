import { db } from "@repo/shared/db";
import { formatPriceCents } from "@repo/shared";
import { requireVenue } from "@/lib/authz";
import { RtForm } from "./rt-form";
import { RigaDocumento } from "./riga-documento";

const METODO: Record<string, string> = {
  card: "Carta",
  cash: "Contanti",
  satispay: "Satispay",
  manual: "Incassato al banco",
};

/**
 * Corrispettivi: cosa è stato certificato e cosa no.
 *
 * Il gestionale incassa, il registratore certifica. Questa pagina serve a
 * vedere che i due numeri coincidano — perché dal 2026 l'Agenzia incrocia i
 * dati degli acquirer con i corrispettivi giornalieri, e uno scostamento non
 * è una svista, è un controllo.
 */
export default async function FiscalePage() {
  const { venue } = await requireVenue();
  const sql = db();

  const [locale] = await sql<
    {
      rt_attivo: boolean;
      rt_modalita: string;
      rt_matricola: string | null;
      rt_agente_hash: string | null;
      rt_agente_visto_at: Date | null;
      agente_fermo: boolean;
      rt_marca: string;
      rt_operatore: number;
      rt_percorso: string | null;
      rt_reparti: Record<string, number>;
      giornata_stacco_ora: number;
    }[]
  >`select rt_attivo, rt_modalita, rt_matricola, rt_agente_hash,
           rt_agente_visto_at, rt_marca, rt_operatore, rt_percorso,
           rt_reparti, giornata_stacco_ora,
           (rt_agente_visto_at is null
            or rt_agente_visto_at < now() - interval '10 minutes') as agente_fermo
      from venues where id = ${venue.venueId}`;

  // Le aliquote che compaiono davvero nel menu: chiedere il reparto per
  // un'aliquota che il locale non usa è una casella in più da guardare.
  const aliquote = await sql<{ v: string }[]>`
    select distinct vat_rate::text as v from menu_items
     where venue_id = ${venue.venueId} order by 1`;

  const documenti = await sql<
    {
      id: string;
      totale_cents: number;
      stato: string;
      numero_documento: string | null;
      errore: string | null;
      pagamenti: Record<string, number>;
      created_at: Date;
      service_date: string;
    }[]
  >`select id, totale_cents, stato, numero_documento, errore, pagamenti,
           created_at, service_date::text as service_date
      from fiscal_documents
     where venue_id = ${venue.venueId}
     order by created_at desc
     limit 100`;

  // Il riepilogo di giornata: è quello che si batte in cassa, o che si
  // confronta con quello che il registratore ha già emesso.
  const perMetodo = await sql<{ metodo: string; totale: string }[]>`
    select chiave as metodo, sum(valore::int)::text as totale
      from fiscal_documents fd
      join venues v on v.id = fd.venue_id,
           lateral jsonb_each_text(fd.pagamenti) as p(chiave, valore)
     where fd.venue_id = ${venue.venueId}
       and fd.service_date =
           ((now() at time zone coalesce(v.timezone, 'Europe/Rome'))
             - make_interval(hours => v.giornata_stacco_ora))::date
     group by chiave
     order by 2 desc`;

  /*
   * I conti chiusi senza documento.
   *
   * L'accodamento avviene dopo la chiusura e fuori dalla transazione —
   * chiudere il tavolo viene prima di tutto — quindi può fallire e lasciare
   * un incasso senza certificazione. È recuperabile solo se si vede: senza
   * questo confronto resterebbe un buco che nessuno nota fino al controllo.
   */
  const scoperti = await sql<
    { id: string; chiuso: Date; incassato: number }[]
  >`select ts.id, ts.closed_at as chiuso,
           coalesce((select sum(p.amount_cents)::int from payments p
                      where p.table_session_id = ts.id and p.status = 'succeeded'), 0)
             as incassato
      from table_sessions ts
      join venues v on v.id = ts.venue_id
     where ts.venue_id = ${venue.venueId}
       and ts.status = 'closed'
       and v.rt_attivo = true
       and ts.closed_at >= now() - interval '7 days'
       and exists (select 1 from orders o
                    where o.table_session_id = ts.id and o.status <> 'cancelled')
       and not exists (select 1 from fiscal_documents fd
                        where fd.table_session_id = ts.id)
     order by ts.closed_at desc
     limit 50`;

  const daFare = documenti.filter(
    (d) => d.stato === "da_emettere" || d.stato === "errore" || d.stato === "in_corso"
  );
  const totaleGiornata = perMetodo.reduce((s, r) => s + Number(r.totale), 0);

  const dataIt = new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-5">
      <h1 className="text-xl font-semibold">Corrispettivi</h1>
      <p className="mt-1 text-sm text-muted">
        Il gestionale incassa, il registratore certifica. Qui si controlla che
        i due numeri coincidano.
      </p>

      {/* --- Riepilogo di giornata ------------------------------------- */}
      <section className="mt-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="font-semibold">Oggi, per metodo di pagamento</h2>
        <p className="mt-0.5 text-xs text-muted">
          Dal 1° gennaio 2026 il documento commerciale deve riportare come è
          stato pagato, e l&apos;Agenzia incrocia questi importi con i dati
          degli acquirer. Se batti a mano, questi sono i numeri da battere.
        </p>

        {perMetodo.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nessun conto chiuso oggi.
          </p>
        ) : (
          <dl className="mt-3 space-y-1 text-sm">
            {perMetodo.map((r) => (
              <div key={r.metodo} className="flex justify-between gap-3">
                <dt>{METODO[r.metodo] ?? r.metodo}</dt>
                <dd className="font-medium tabular-nums">
                  {formatPriceCents(Number(r.totale))}
                </dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t border-border pt-1 font-semibold">
              <dt>Totale</dt>
              <dd className="tabular-nums">{formatPriceCents(totaleGiornata)}</dd>
            </div>
          </dl>
        )}
      </section>

      {locale?.rt_attivo && scoperti.length > 0 && (
        <section className="mt-4 rounded-xl border border-danger bg-danger/5 p-4">
          <h2 className="font-semibold text-danger">
            {scoperti.length}{" "}
            {scoperti.length === 1 ? "conto chiuso" : "conti chiusi"} senza
            documento
          </h2>
          <p className="mt-0.5 text-sm">
            Sono incassi che non risultano certificati. Succede se qualcosa è
            andato storto mentre il conto si chiudeva: il tavolo si chiude
            comunque, perché fermare la sala sarebbe peggio, ma il documento
            va emesso a mano.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {scoperti.slice(0, 10).map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <span className="text-muted">{dataIt.format(s.chiuso)}</span>
                <span className="font-medium tabular-nums">
                  {formatPriceCents(s.incassato)}
                </span>
              </li>
            ))}
          </ul>
          {scoperti.length > 10 && (
            <p className="mt-1 text-xs text-muted">
              e altri {scoperti.length - 10}.
            </p>
          )}
        </section>
      )}

      {/* --- Collegamento ---------------------------------------------- */}
      <section className="mt-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">Il tuo registratore</h2>
        <RtForm
          attivo={locale?.rt_attivo ?? false}
          modalita={locale?.rt_modalita ?? "manuale"}
          matricola={locale?.rt_matricola ?? ""}
          haCodice={Boolean(locale?.rt_agente_hash)}
          agenteVistoIl={
            locale?.rt_agente_visto_at
              ? dataIt.format(locale.rt_agente_visto_at)
              : null
          }
          agenteFermo={locale?.agente_fermo ?? true}
          marca={locale?.rt_marca ?? "epson"}
          operatore={locale?.rt_operatore ?? 1}
          percorso={locale?.rt_percorso ?? ""}
          reparti={locale?.rt_reparti ?? {}}
          stacco={locale?.giornata_stacco_ora ?? 5}
          aliquote={aliquote.map((a) => Number(a.v))}
        />
      </section>

      {/* --- Documenti -------------------------------------------------- */}
      <section className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Documenti</h2>
          {daFare.length > 0 && (
            <p className="text-sm text-danger">
              {daFare.length} da certificare
            </p>
          )}
        </div>

        {documenti.length === 0 ? (
          <p className="mt-2 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
            {locale?.rt_attivo
              ? "Ancora niente: i documenti compaiono qui quando si chiude un conto."
              : "Il collegamento è spento, quindi non viene messo in coda niente. Finché resta così i documenti li batti in cassa come hai sempre fatto."}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {documenti.map((d) => (
              <RigaDocumento
                key={d.id}
                id={d.id}
                totale={formatPriceCents(d.totale_cents)}
                stato={d.stato}
                numero={d.numero_documento}
                errore={d.errore}
                quando={dataIt.format(d.created_at)}
                pagamenti={Object.entries(d.pagamenti ?? {})
                  .map(([m, c]) => `${METODO[m] ?? m} ${formatPriceCents(Number(c))}`)
                  .join(" · ")}
              />
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 rounded-xl border border-border p-4 text-xs leading-relaxed text-muted">
        Questo gestionale <strong>non sostituisce il registratore
        telematico</strong>: prepara i documenti e, se colleghi il programma
        sulla cassa, glieli fa emettere. Come vada dichiarato quello che
        incassi tramite la piattaforma lo stabilisce il tuo commercialista —
        qui trovi i numeri per farlo, non il parere.
      </p>
    </main>
  );
}
