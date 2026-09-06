import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { repartiDelLocale } from "@/lib/reparti-locale";
import Link from "next/link";
import { PrintButton } from "./print-button";
import { moduloAttivo } from "@/lib/authz";
import { ModuloNonAttivo } from "../../modulo-non-attivo";
import { linguaUtente } from "@/lib/lingua";
import { LinguaProvider } from "@repo/shared/i18n/contesto";
import { tServizio } from "@/i18n/servizio";

/**
 * Comande da stampare su carta. Volutamente non è una stampa ESC/POS su
 * stampante termica di rete: passando dal dialogo di stampa del browser
 * funziona con qualsiasi stampante già in cucina, senza driver né
 * configurazione IP.
 */


export default async function PrintOrdersPage({
  searchParams,
}: PageProps<"/dashboard/orders/stampa">) {
  const params = await searchParams;
  const scelto = Array.isArray(params.reparto) ? params.reparto[0] : params.reparto;
  const session = await auth();
  const venue = session?.venues[0];
  const lingua = await linguaUtente();
  const t = tServizio(lingua);
  if (!venue) return <main className="p-4">{t("errore.senza_locale")}</main>;

  // Il modulo si verifica qui e non solo nel menu: chi digita
  // l'indirizzo la pagina la otterrebbe lo stesso.
  if (!(await moduloAttivo(venue.venueId, "ordini"))) {
    return <ModuloNonAttivo modulo="ordini" />;
  }

  interface ComandaRow {
    order_id: string;
    item_id: string;
    table_code: string;
    item_name: string;
    quantity: number;
    notes: string | null;
    order_notes: string | null;
    guest_label: string | null;
    item_status: string;
    created_at: string;
    reparto: string;
    scelte: Array<{ opzione: string }>;
  }

  const sql = db();
  const reparti = await repartiDelLocale(venue.venueId);
  const etichettaReparto = (c: string | null) =>
    reparti.find((r) => r.chiave === (c ?? "cucina"))?.etichetta ??
    c ??
    t("reparto.cucina");
  const rows = await sql<ComandaRow[]>`
    select o.id as order_id, oi.id as item_id, t.code as table_code,
           mi.name as item_name, oi.quantity, oi.notes,
           o.notes as order_notes, o.guest_label, oi.status as item_status,
           o.created_at,
           coalesce(mc.reparto, 'cucina') as reparto,
           oi.selected_options as scelte
    from order_items oi
    join orders o on o.id = oi.order_id
    join table_sessions ts on ts.id = o.table_session_id
    join tables t on t.id = ts.table_id
    join menu_items mi on mi.id = oi.menu_item_id
    left join menu_categories mc on mc.id = mi.category_id
    where o.venue_id = ${venue.venueId}
      and oi.status not in ('served', 'cancelled')
      -- Solo i tavoli ancora aperti, come fa la board.
      --
      -- Senza questo la pagina accumulava per sempre: chiudere un tavolo
      -- chiude la sessione ma non porta le sue righe a 'served', e nessuno
      -- in tutto il progetto le porta a 'served' in blocco. In un all you
      -- can eat nessuno picchietta "servito" ottanta volte a tavolo, quindi
      -- le righe restano a 'sent_to_kitchen' per sempre. Al secondo giorno
      -- si stampavano le comande di ieri insieme a quelle di stasera — e chi
      -- la usa come ripiego quando lo schermo si pianta preparava roba già
      -- mangiata e pagata.
      and ts.status = 'open'
      -- E comunque non oltre la giornata: una sessione lasciata aperta per
      -- sbaglio non deve trascinarsi dietro le comande di una settimana fa.
      and o.created_at >= now() - interval '24 hours'
    order by o.created_at asc, mi.name`;

  // Presenti davvero adesso: mostrare "Pizzeria" a chi non ne ha una è una
  // scelta in più da leggere ogni volta senza motivo.
  const presenti = [...new Set(rows.map((r) => r.reparto))].sort();

  // Il foglio del bar non deve contenere i primi: chi lo stacca lo porta in
  // un posto dove quei piatti non si fanno.
  const righe = scelto && scelto !== "tutti"
    ? rows.filter((r) => r.reparto === scelto)
    : rows;

  // Una comanda con bar e cucina deve produrre due fogli: mischiarli in uno
  // costringe chi lo ritira a separare a penna quello che va ai reparti.
  const byOrder = new Map<string, ComandaRow[]>();
  for (const row of righe) {
    const key = `${row.order_id}:${row.reparto}`;
    if (!byOrder.has(key)) byOrder.set(key, []);
    byOrder.get(key)!.push(row);
  }

  const totalePezzi = righe.reduce((totale, row) => totale + row.quantity, 0);
  const stato: Record<string, string> = {
    pending: t("stato.pending"),
    sent_to_kitchen: t("stampa.stato.sent_to_kitchen"),
    preparing: t("stato.preparing"),
    ready: t("stato.ready"),
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-5">
      <div className="mb-5 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard/orders"
              className="mb-2 inline-flex min-h-10 items-center text-sm font-medium text-muted underline underline-offset-4"
            >
              {t("stampa.indietro")}
            </Link>
            <h1 className="text-lg font-semibold">{t("stampa.titolo")}</h1>
            <p className="mt-1 text-sm text-muted">{t("stampa.sottotitolo")}</p>
          </div>
          {/* Il provider vive nel layout; qui si rimette perché il bottone
              deve trovare una lingua anche se questo albero ne è fuori. */}
          <LinguaProvider lingua={lingua}>
            <PrintButton />
          </LinguaProvider>
        </div>

        <dl className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-surface p-3">
            <dt className="text-xs text-muted">{t("stampa.conteggio.comande")}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{byOrder.size}</dd>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <dt className="text-xs text-muted">{t("stampa.conteggio.pezzi")}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{totalePezzi}</dd>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <dt className="text-xs text-muted">{t("stampa.conteggio.reparti")}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{presenti.length}</dd>
          </div>
        </dl>
      </div>

      <header className="mb-6 hidden border-b-2 border-black pb-3 print:block">
        <h1 className="text-xl font-bold">{venue.venueName}</h1>
        <p className="text-sm">
          {t("stampa.intestazione", { quando: t.dataOra(new Date()) })}
        </p>
      </header>

      {presenti.length > 1 && (
        <nav className="mb-4 flex flex-wrap gap-2 print:hidden">
          {["tutti", ...presenti].map((r) => {
            const attivo = (scelto ?? "tutti") === r;
            return (
              <a
                key={r}
                href={`/dashboard/orders/stampa?reparto=${r}`}
                className={`flex min-h-11 items-center rounded-full px-4 text-sm font-medium ${
                  attivo
                    ? "bg-accent text-accent-foreground"
                    : "border border-border"
                }`}
              >
                {r === "tutti" ? t("filtro.tutto") : etichettaReparto(r)}
              </a>
            );
          })}
        </nav>
      )}

      {byOrder.size === 0 && (
        <p className="text-sm text-muted">{t("stampa.vuoto")}</p>
      )}

      {[...byOrder.entries()].map(([key, items]) => (
        <article
          key={key}
          /* `last:break-after-auto`: il salto pagina sull'ultima comanda
             faceva uscire un foglio bianco a ogni stampa. */
          className="mb-4 break-after-page border-b-2 border-dashed pb-4 last:break-after-auto last:border-0"
        >
          <header className="mb-3 flex items-start justify-between gap-4 border-b border-border pb-3 print:border-black">
            <div>
              <p className="text-2xl font-bold">
                {t("tavolo.etichetta")} {items[0].table_code}
              </p>
              {items[0].guest_label && (
                <p className="mt-1 text-sm font-medium">
                  {t("stampa.cliente", { nome: items[0].guest_label })}
                </p>
              )}
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">{etichettaReparto(items[0].reparto)}</p>
              <p className="text-muted print:text-black">
                {t("stampa.comanda", {
                  numero: items[0].order_id.slice(0, 8).toUpperCase(),
                })}
              </p>
              <time dateTime={items[0].created_at}>
                {t.dataOra(new Date(items[0].created_at))}
              </time>
            </div>
          </header>
          {items[0].order_notes && (
            <p className="mb-3 border-l-4 border-accent pl-3 text-sm font-semibold print:border-black">
              {t("stampa.nota_ordine", { nota: items[0].order_notes })}
            </p>
          )}
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.item_id} className="text-lg">
                <div className="flex items-start justify-between gap-3">
                  <span><strong>{item.quantity}×</strong> {item.item_name}</span>
                  <span className="shrink-0 text-xs font-medium uppercase text-muted print:text-black">
                    {stato[item.item_status] ?? item.item_status}
                  </span>
                </div>
                {/* Le varianti sulla carta, e in evidenza. Senza, chi lavora
                    sulla comanda stampata — il caso previsto per una cucina
                    senza schermo — prepara il piatto con l'ingrediente che il
                    cliente ha tolto. Se quell'ingrediente è un allergene non
                    è un fastidio, è un rischio. */}
                {item.scelte?.length > 0 && (
                  <div className="text-lg font-bold uppercase">
                    → {item.scelte.map((s) => s.opzione).join(" · ")}
                  </div>
                )}
                {item.notes && <div className="text-base italic">— {item.notes}</div>}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-border pt-2 text-right text-sm font-semibold print:border-black">
            {t.n(
              items.reduce((totale, item) => totale + item.quantity, 0),
              "stampa.pezzi"
            )}
          </p>
        </article>
      ))}
    </main>
  );
}
