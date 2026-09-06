import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { localeDalToken } from "@/lib/rt-auth";
import { RT_DA_VERIFICARE } from "@/app/dashboard/fiscale/rt-incerto";

/**
 * I documenti che il registratore deve ancora emettere.
 *
 * Lo chiama l'agente che gira sul computer della cassa, ogni pochi secondi:
 * la stampante sta sulla rete del locale e da qui non la raggiungiamo.
 *
 * Le righe vengono consegnate marcandole 'in_corso', non solo leggendole:
 * due casse accese sullo stesso locale — capita, il vecchio computer che
 * nessuno ha spento — stamperebbero altrimenti lo stesso scontrino due
 * volte, cioè un corrispettivo raddoppiato.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = await localeDalToken(request);
  if (!locale) {
    return NextResponse.json({ error: "Non riconosciuto" }, { status: 401 });
  }

  const sql = db();

  const righe = await sql<
    {
      id: string;
      totale_cents: number;
      righe: unknown;
      pagamenti: unknown;
      tentativi: number;
    }[]
  >`
    update fiscal_documents
       set stato = 'in_corso', tentativi = tentativi + 1, preso_at = now()
     where id in (
       select id from fiscal_documents
        where venue_id = ${locale.venueId}
          /*
           * Solo la giornata di servizio in corso.
           *
           * Il computer della cassa resta spento sabato sera e si riaccende
           * domenica: senza questa condizione i cento documenti di sabato
           * uscivano dal registratore dentro la giornata fiscale di domenica,
           * dopo che la chiusura di sabato era già stata fatta — sabato a
           * zero, domenica del doppio. Un documento di una giornata già
           * chiusa non si emette più da solo: va regolarizzato a mano, e la
           * pagina Corrispettivi lo mostra apposta in un blocco a parte.
           */
          and service_date = (
            select ((now() at time zone coalesce(v.timezone, 'Europe/Rome'))
                     - make_interval(hours => v.giornata_stacco_ora))::date
              from venues v where v.id = ${locale.venueId})
          and (
            stato = 'da_emettere'
            /*
             * Un tentativo andato male si riprova, ma non subito e non
             * all'infinito.
             *
             * L'agente gira ogni pochi secondi: senza distanziare i tentativi
             * un guasto che dura un minuto — la carta finita alle 20:30 —
             * bruciava tutti e cinque i tentativi di ogni documento in coda
             * in un quarto di minuto, e rimessa la carta quei conti non
             * uscivano più. Si aspetta un minuto, poi cinque, poi un quarto
             * d'ora: il tempo che serve a una persona per accorgersene e
             * rimediare. Dopo cinque volte è un guasto vero e va guardato,
             * e da lì si riparte solo con 'rimetti in coda'.
             */
            or (stato = 'errore' and tentativi < 5
                and coalesce(preso_at, created_at) < now() - (
                  case when tentativi <= 1 then interval '1 minute'
                       when tentativi = 2 then interval '5 minutes'
                       else interval '15 minutes' end))
            /*
             * Preso in carico e mai concluso: l'agente è morto a metà.
             *
             * Si guarda quando è stato preso, non quando è nato. Con
             * created_at un documento di mezz'ora fa veniva riconsegnato a
             * ogni interrogazione — anche mentre una cassa lo stava
             * stampando — e lo stesso scontrino usciva più volte.
             *
             * Fanno eccezione quelli che l'agente ha marcato da verificare:
             * lì la connessione è caduta a comando già partito e lo scontrino
             * può essere uscito davvero. Riconsegnarli vorrebbe dire
             * rischiare di certificare due volte lo stesso incasso, quindi
             * restano fermi finché una persona non guarda il registratore.
             */
            or (stato = 'in_corso'
                and coalesce(left(errore, ${RT_DA_VERIFICARE.length}), '')
                    <> ${RT_DA_VERIFICARE}
                and coalesce(preso_at, created_at) < now() - interval '5 minutes')
          )
        order by created_at
        limit 20
        for update skip locked
     )
    returning id, totale_cents, righe, pagamenti, tentativi`;

  /*
   * A coda vuota si risponde e basta.
   *
   * La configurazione della stampante serve solo per stampare, e la coda è
   * vuota quasi sempre: leggerla comunque voleva dire una query in più a
   * ogni interrogazione, di ogni locale, tutto il giorno e tutta la notte.
   */
  if (righe.length === 0) {
    return NextResponse.json({ documenti: [] });
  }

  /*
   * Marca, operatore, percorso e reparti viaggiano con la coda.
   *
   * Stanno nel gestionale e non nell'agente: cambiare stampante o correggere
   * un reparto non deve significare andare sul computer della cassa a
   * modificare un file — che è la cosa che poi nessuno fa, e il reparto
   * sbagliato resta lì.
   */
  const [conf] = await sql<
    {
      rt_marca: string;
      rt_operatore: number;
      rt_percorso: string | null;
      rt_reparti: Record<string, number>;
    }[]
  >`select rt_marca, rt_operatore, rt_percorso, rt_reparti
      from venues where id = ${locale.venueId}`;

  return NextResponse.json({
    matricola: locale.matricola,
    stampante: {
      marca: conf?.rt_marca ?? "epson",
      operatore: conf?.rt_operatore ?? 1,
      percorso: conf?.rt_percorso ?? null,
      reparti: conf?.rt_reparti ?? {},
    },
    documenti: righe.map((r) => ({
      id: r.id,
      totaleCents: r.totale_cents,
      righe: r.righe,
      pagamenti: r.pagamenti,
      tentativo: r.tentativi,
    })),
  });
}
