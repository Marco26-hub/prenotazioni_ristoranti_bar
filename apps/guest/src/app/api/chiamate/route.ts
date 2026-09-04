import { NextResponse } from "next/server";
import { db } from "@repo/shared/db";
import { checkRateLimit, clientKey } from "@repo/shared/rate-limit";

/**
 * Chiamata dal tavolo.
 *
 * Serve quando il software non può concludere da solo: il contante non passa
 * da nessun circuito, qualcuno deve andare al tavolo, incassare e portare
 * scontrino o fattura. Senza questo, l'unico modo per dirlo era alzare la
 * mano e sperare — cioè esattamente il motivo per cui il cliente ha inquadrato
 * il QR.
 */

interface Corpo {
  token: string;
  motivo: "contanti" | "cameriere" | "conto";
  documento?: "scontrino" | "fattura";
  nota?: string;
}

const MOTIVI = new Set(["contanti", "cameriere", "conto"]);
const DOCUMENTI = new Set(["scontrino", "fattura"]);

export async function POST(request: Request) {
  const corpo = (await request.json().catch(() => null)) as Corpo | null;
  if (!corpo?.token || !MOTIVI.has(corpo.motivo)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  /*
   * Il tavolo non deve poter tempestare la sala: chi non vede arrivare
   * nessuno preme più volte, ed è comprensibile, ma sei chiamate in un'ora
   * sono già più di quante ne servano.
   *
   * Il conteggio è per tavolo, non per solo indirizzo: legato all'indirizzo
   * e basta, chi aveva chiamato sei volte a pranzo non poteva più chiamare
   * la sera in un altro locale — e dietro il NAT di un operatore mobile
   * l'indirizzo è condiviso da molte persone che non si conoscono.
   */
  const { allowed } = await checkRateLimit(
    clientKey(request, `chiamata:${corpo.token.slice(0, 60)}`),
    6,
    3600
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Hai già chiamato. Il personale sta arrivando." },
      { status: 429 }
    );
  }
  if (corpo.documento && !DOCUMENTI.has(corpo.documento)) {
    return NextResponse.json({ error: "Documento non valido" }, { status: 400 });
  }

  const sql = db();

  // Il token del QR è l'unica autorizzazione: identifica il tavolo e vale
  // solo finché la sessione è aperta.
  const [sessione] = await sql<{ id: string; venue_id: string; code: string }[]>`
    select ts.id, ts.venue_id, t.code
      from table_sessions ts
      join tables t on t.id = ts.table_id
     where t.qr_token = ${corpo.token} and ts.status = 'open'`;

  if (!sessione) {
    return NextResponse.json(
      { error: "Nessun tavolo aperto: chiedi al personale" },
      { status: 404 }
    );
  }

  // Se una chiamata dello stesso tipo è già aperta si aggiorna quella: chi
  // preme tre volte non deve generare tre righe da smaltire in sala.
  await sql`
    insert into table_calls (venue_id, table_session_id, motivo, documento, nota)
    values (${sessione.venue_id}, ${sessione.id}, ${corpo.motivo},
            ${corpo.documento ?? null},
            ${corpo.nota?.trim().slice(0, 200) || null})
    on conflict (table_session_id, motivo) where handled_at is null
    do update set documento = excluded.documento,
                  nota = excluded.nota,
                  created_at = now()`;

  return NextResponse.json({
    ok: true,
    tavolo: sessione.code,
    messaggio:
      corpo.motivo === "contanti"
        ? "Il personale sta arrivando al tavolo per l'incasso."
        : "Il personale sta arrivando.",
  });
}
