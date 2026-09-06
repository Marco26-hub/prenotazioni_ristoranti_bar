import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { ChiediAssistenza } from "./form";
import { linguaUtente } from "@/lib/lingua";
import { tPersone } from "@/i18n/persone";
import { LinguaProvider } from "@repo/shared/i18n/contesto";

export default async function AssistenzaPage() {
  const session = await auth();
  const lingua = await linguaUtente();
  const t = tPersone(lingua);

  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">{t("errore.nessun_locale")}</main>;

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

  // Le etichette dello stato: i valori aperto/in_corso/risolto restano quelli
  // a database.
  const ETICHETTA: Record<string, string> = {
    aperto: t("assistenza.stato.aperto"),
    in_corso: t("assistenza.stato.in_corso"),
    risolto: t("assistenza.stato.risolto"),
  };

  return (
    <LinguaProvider lingua={lingua}>
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        <div>
          <h1 className="text-lg font-semibold">{t("assistenza.titolo")}</h1>
          <p className="mt-0.5 text-sm text-muted">{t("assistenza.sottotitolo")}</p>
        </div>

        <section className="rounded-xl border border-border bg-surface p-4">
          <ChiediAssistenza />
        </section>

        {richieste.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold">{t("assistenza.tue_richieste")}</h2>
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
                    {ETICHETTA[r.stato] ?? r.stato} · {t.data(r.created_at, "corta")}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-muted">
                  {r.messaggio}
                </p>
                {r.risposta && (
                  <div className="mt-3 rounded-lg border-l-2 border-accent bg-background p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {t("assistenza.risposta")}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm">{r.risposta}</p>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </LinguaProvider>
  );
}
