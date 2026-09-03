import { db } from "@repo/shared/db";
import { requireVenue } from "@/lib/authz";
import { SegnaLette } from "./segna-lette";

/**
 * Le recensioni lasciate dal tavolo.
 *
 * Non è una vetrina: è la pagina che dice se qualcosa non va mentre si può
 * ancora rimediare. Per questo i voti bassi stanno in cima e non in fondo, e
 * quelli non ancora letti restano segnati.
 */
export default async function RecensioniPage() {
  const { venue } = await requireVenue();
  const sql = db();

  const recensioni = await sql<
    {
      id: string;
      voto: number;
      commento: string | null;
      nome: string | null;
      created_at: Date;
      letta_at: Date | null;
      table_code: string | null;
    }[]
  >`select r.id, r.voto, r.commento, r.nome, r.created_at, r.letta_at,
           t.code as table_code
      from reviews r
      left join table_sessions ts on ts.id = r.table_session_id
      left join tables t on t.id = ts.table_id
     where r.venue_id = ${venue.venueId}
     order by r.created_at desc
     limit 200`;

  const [somma] = await sql<{ n: string; media: string | null }[]>`
    select count(*)::text as n, round(avg(voto), 1)::text as media
      from reviews where venue_id = ${venue.venueId}`;

  const totale = Number(somma?.n ?? 0);
  const daLeggere = recensioni.filter((r) => !r.letta_at).length;

  // I voti bassi non ancora letti per primi: è l'unico ordine che serve a
  // qualcosa quando si apre questa pagina fra un servizio e l'altro.
  const ordinate = [...recensioni].sort((a, b) => {
    const urgente = (r: (typeof recensioni)[number]) =>
      !r.letta_at && r.voto <= 3 ? 0 : 1;
    return urgente(a) - urgente(b) || b.created_at.getTime() - a.created_at.getTime();
  });

  const dataIt = new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Recensioni</h1>
        {totale > 0 && (
          <p className="text-sm text-muted">
            <span className="text-base font-semibold text-foreground">
              {somma?.media ?? "—"}
            </span>{" "}
            di media su {totale}
            {daLeggere > 0 && ` · ${daLeggere} da leggere`}
          </p>
        )}
      </div>

      {totale === 0 ? (
        <p className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          Ancora nessuna. La richiesta compare in fondo al menu del tavolo,
          dopo il conto: la lasciano mentre sono ancora seduti, quindi arrivano
          dal primo servizio con i QR sui tavoli. Il link alla tua pagina
          pubblica si imposta in Impostazioni.
        </p>
      ) : (
        <>
          {daLeggere > 0 && <SegnaLette quante={daLeggere} />}
          <ul className="mt-4 space-y-3">
            {ordinate.map((r) => (
              <li
                key={r.id}
                className={`rounded-xl border p-4 ${
                  r.letta_at
                    ? "border-border bg-surface"
                    : r.voto <= 3
                      ? "border-danger bg-danger/5"
                      : "border-accent bg-accent/5"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span
                    aria-label={`${r.voto} su 5`}
                    className="text-lg text-amber-500"
                  >
                    {"★".repeat(r.voto)}
                    <span className="text-border">{"★".repeat(5 - r.voto)}</span>
                  </span>
                  {r.nome && <span className="text-sm font-medium">{r.nome}</span>}
                  <span className="text-xs text-muted">
                    {dataIt.format(r.created_at)}
                    {r.table_code && ` · tavolo ${r.table_code}`}
                  </span>
                  {!r.letta_at && (
                    <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
                      nuova
                    </span>
                  )}
                </div>
                {r.commento && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
                    {r.commento}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
