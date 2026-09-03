import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { ChiediAssistenza } from "./form";

export default async function AssistenzaPage() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  const sql = db();
  const richieste = await sql<
    {
      id: string;
      oggetto: string;
      messaggio: string;
      urgenza: string;
      stato: string;
      risposta: string | null;
      created_at: Date;
    }[]
  >`
    select id, oggetto, messaggio, urgenza, stato, risposta, created_at
      from support_tickets
     where venue_id = ${venue.venueId}
     order by created_at desc
     limit 30`;

  const ETICHETTA: Record<string, string> = {
    aperto: "In attesa",
    in_corso: "Ci stiamo lavorando",
    risolto: "Risolta",
  };

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
      <div>
        <h1 className="text-lg font-semibold">Assistenza</h1>
        <p className="mt-0.5 text-sm text-muted">
          Scrivi qui invece che su WhatsApp: la richiesta resta, e la risposta
          la trovi in questa pagina anche fra una settimana.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <ChiediAssistenza />
      </section>

      {richieste.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Le tue richieste</h2>
          {richieste.map((r) => (
            <article
              key={r.id}
              className={`rounded-xl border p-4 ${
                r.stato === "risolto" ? "border-border opacity-75" : "border-accent"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{r.oggetto}</p>
                <span className="text-xs text-muted">
                  {ETICHETTA[r.stato] ?? r.stato} ·{" "}
                  {new Intl.DateTimeFormat("it-IT", { dateStyle: "short" }).format(
                    r.created_at
                  )}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-muted">
                {r.messaggio}
              </p>
              {r.risposta && (
                <div className="mt-3 rounded-lg border-l-2 border-accent bg-background p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Risposta
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm">{r.risposta}</p>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
