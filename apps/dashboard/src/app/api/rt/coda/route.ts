import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { localeDalToken } from "@/lib/rt-auth";

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
       set stato = 'in_corso', tentativi = tentativi + 1
     where id in (
       select id from fiscal_documents
        where venue_id = ${locale.venueId}
          and (
            stato = 'da_emettere'
            -- Un tentativo andato male si riprova, ma non all'infinito: dopo
            -- cinque volte è un guasto, e va guardato da una persona invece
            -- che ritentato per sempre.
            or (stato = 'errore' and tentativi < 5)
            -- Preso in carico e mai concluso: l'agente è morto a metà.
            or (stato = 'in_corso' and created_at < now() - interval '5 minutes')
          )
        order by created_at
        limit 20
        for update skip locked
     )
    returning id, totale_cents, righe, pagamenti, tentativi`;

  return NextResponse.json({
    matricola: locale.matricola,
    documenti: righe.map((r) => ({
      id: r.id,
      totaleCents: r.totale_cents,
      righe: r.righe,
      pagamenti: r.pagamenti,
      tentativo: r.tentativi,
    })),
  });
}
