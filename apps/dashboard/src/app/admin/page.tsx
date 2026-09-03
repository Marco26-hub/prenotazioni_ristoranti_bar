import { redirect } from "next/navigation";
import { db } from "@repo/shared/db";
import { requireSuperAdmin } from "@/lib/authz";
import { LocaleRiga, type LocaleAdmin } from "./locale-riga";
import { TicketRiga } from "./ticket-riga";

export default async function AdminPage() {
  const admin = await requireSuperAdmin();

  // Finché la password iniziale è ancora in uso non si entra da nessun'altra
  // parte: è l'unica cosa che deve poter fare.
  if (admin.deveCambiarePassword) redirect("/admin/password");

  const sql = db();
  const locali = await sql<
    {
      id: string;
      name: string;
      slug: string;
      subscription_status: string;
      subscription_period_end: Date | null;
      subscription_id: string | null;
      modules: string[] | null;
      created_at: Date;
      tavoli: number;
      piatti: number;
      giorni_residui: number | null;
      referente_nome: string | null;
      referente_telefono: string | null;
      referente_email: string | null;
      provenienza: string | null;
      ricontattare_il: Date | null;
      motivo_abbandono: string | null;
    }[]
  >`
    select v.id, v.name, v.slug, v.subscription_status, v.subscription_period_end,
           v.subscription_id, v.modules, v.created_at,
           v.referente_nome, v.referente_telefono, v.referente_email,
           v.provenienza, v.ricontattare_il, v.motivo_abbandono,
           (select count(*)::int from tables t where t.venue_id = v.id) as tavoli,
           (select count(*)::int from menu_items m where m.venue_id = v.id) as piatti,
           case when v.subscription_period_end is null then null
                else ceil(extract(epoch from (v.subscription_period_end - now())) / 86400)::int
           end as giorni_residui
      from venues v
     order by v.created_at desc`;

  const ticket = await sql<
    {
      id: string;
      venue_id: string;
      nome_locale: string;
      oggetto: string;
      messaggio: string;
      urgenza: string;
      stato: string;
      risposta: string | null;
      aperto_da_label: string;
      created_at: Date;
      ore_fa: number;
    }[]
  >`
    select t.id, t.venue_id, v.name as nome_locale, t.oggetto, t.messaggio,
           t.urgenza, t.stato, t.risposta, t.aperto_da_label, t.created_at,
           floor(extract(epoch from (now() - t.created_at)) / 3600)::int as ore_fa
      from support_tickets t
      join venues v on v.id = t.venue_id
     where t.stato <> 'risolto'
     order by (t.urgenza = 'blocca_servizio') desc, t.created_at`;

  const note = await sql<
    { venue_id: string; autore_label: string; testo: string; created_at: Date }[]
  /*
   * Un tetto per locale, non un tetto globale.
   *
   * Con `limit 200` su tutta la piattaforma le note più recenti di pochi
   * clienti riempivano la lista e per tutti gli altri la sezione appariva
   * vuota: non "nessuna nota", proprio assente — che si legge come "questo
   * cliente non l'abbiamo mai sentito", il contrario del vero.
   */
  >`select venue_id, autore_label, testo, created_at from (
        select venue_id, autore_label, testo, created_at,
               row_number() over (partition by venue_id order by created_at desc) as n
          from venue_notes) x
     where n <= 20
     order by created_at desc`;

  type Nota = (typeof note)[number];
  const notePerLocale = new Map<string, Nota[]>();
  for (const n of note) {
    const l = notePerLocale.get(n.venue_id) ?? [];
    l.push(n);
    notePerLocale.set(n.venue_id, l);
  }

  const eventi = await sql<
    { venue_id: string | null; admin_label: string; azione: string; dettaglio: string | null; created_at: Date }[]
  // Stesso motivo delle note: venti righe su tutta la piattaforma erano
  // venti righe di un cliente solo, e lo storico degli altri spariva.
  >`select venue_id, admin_label, azione, dettaglio, created_at from (
        select venue_id, admin_label, azione, dettaglio, created_at,
               row_number() over (partition by venue_id order by created_at desc) as n
          from platform_events) x
     where n <= 10
     order by created_at desc`;

  type Evento = (typeof eventi)[number];
  const perLocale = new Map<string, Evento[]>();
  for (const e of eventi) {
    if (!e.venue_id) continue;
    const l = perLocale.get(e.venue_id) ?? [];
    l.push(e);
    perLocale.set(e.venue_id, l);
  }

  const dati: LocaleAdmin[] = locali.map((v) => ({
    id: v.id,
    nome: v.name,
    slug: v.slug,
    stato: v.subscription_status,
    scadenza: v.subscription_period_end ? v.subscription_period_end.toISOString() : null,
    giorniResidui: v.giorni_residui,
    scheda: {
      referente_nome: v.referente_nome ?? "",
      referente_telefono: v.referente_telefono ?? "",
      referente_email: v.referente_email ?? "",
      provenienza: v.provenienza ?? "",
      ricontattare_il: v.ricontattare_il
        ? v.ricontattare_il.toISOString().slice(0, 10)
        : "",
      motivo_abbandono: v.motivo_abbandono ?? "",
    },
    note: (notePerLocale.get(v.id) ?? []).map((n) => ({
      chi: n.autore_label,
      testo: n.testo,
      quando: n.created_at.toISOString(),
    })),
    pagaConCarta: Boolean(v.subscription_id),
    moduli: v.modules ?? [],
    tavoli: v.tavoli,
    piatti: v.piatti,
    interventi: (perLocale.get(v.id) ?? []).map((e) => ({
      chi: e.admin_label,
      azione: e.azione,
      dettaglio: e.dettaglio,
      quando: e.created_at.toISOString(),
    })),
  }));

  const attivi = dati.filter((v) => v.moduli.length > 0).length;

  /*
   * Le scadenze vicine, prima di tutto il resto.
   *
   * Un abbonamento che scade fra cinque giorni è una telefonata da fare
   * adesso; scoperto dopo, è un cliente perso. Rientrano anche quelli già
   * scaduti, che sono la stessa cosa in ritardo.
   */
  const inScadenza = dati
    .filter((v) => v.giorniResidui !== null && v.giorniResidui <= 14)
    .sort((a, b) => (a.giorniResidui ?? 0) - (b.giorniResidui ?? 0));

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold">Locali</h1>
        <p className="text-sm text-muted">
          {dati.length} in tutto · {attivi} con almeno un modulo attivo
        </p>
      </div>

      <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        Chi paga con carta viene attivato da solo dal webhook di Stripe, con i
        moduli scritti nei metadata del prezzo. Qui si interviene per gli
        altri casi: bonifico, prova estesa concordata, condizioni particolari.
        Ogni modifica resta scritta accanto al locale.
      </p>

      {ticket.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">
            Assistenza{" "}
            <span className="font-normal text-muted">({ticket.length} da gestire)</span>
          </h2>
          <ul className="space-y-2">
            {ticket.map((t) => (
              <TicketRiga
                key={t.id}
                ticket={{
                  id: t.id,
                  locale: t.nome_locale,
                  oggetto: t.oggetto,
                  messaggio: t.messaggio,
                  urgente: t.urgenza === "blocca_servizio",
                  stato: t.stato,
                  risposta: t.risposta,
                  chi: t.aperto_da_label,
                  oreFa: t.ore_fa,
                }}
              />
            ))}
          </ul>
        </section>
      )}

      {inScadenza.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">
            In scadenza{" "}
            <span className="font-normal text-muted">
              (entro 14 giorni, o già scaduti)
            </span>
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {inScadenza.map((v) => {
              const g = v.giorniResidui ?? 0;
              return (
                <li
                  key={v.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 p-3 text-sm"
                >
                  <span className="font-medium">{v.nome}</span>
                  <span className={g < 0 ? "font-medium text-danger" : "text-amber-700"}>
                    {g < 0 ? `scaduto da ${Math.abs(g)} giorni` : `fra ${g} giorni`}
                    {v.pagaConCarta
                      ? " · rinnovo automatico"
                      : " · da rinnovare a mano"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Tutti i locali</h2>
        <ul className="space-y-3">
          {dati.map((v) => (
            <LocaleRiga key={v.id} locale={v} />
          ))}
        </ul>
      </section>
    </main>
  );
}
