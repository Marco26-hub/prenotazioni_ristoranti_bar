import "server-only";
import { contoSessione } from "./conto";

/**
 * Il documento commerciale da emettere quando un conto si chiude.
 *
 * Il gestionale incassa, ma la certificazione la fa il registratore
 * telematico. Qui si prepara la riga da mettere in coda: cosa è stato
 * consumato, quanto, e — dal 2026 è obbligatorio — con quale mezzo è stato
 * pagato, perché l'Agenzia incrocia i dati degli acquirer con i corrispettivi
 * giornalieri e gli scostamenti generano controlli.
 *
 * Si scrive alla chiusura e non prima: finché il tavolo è aperto il conto
 * cambia, e un documento emesso a metà pasto sarebbe un corrispettivo
 * sbagliato da stornare.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Sql = any;

export interface RigaFiscale {
  descrizione: string;
  quantita: number;
  prezzoUnitarioCents: number;
  ivaPercent: number;
}

/**
 * Mette in coda il documento di questa sessione.
 *
 * Idempotente: l'indice unico sulla sessione fa sì che chiudere due volte
 * lo stesso tavolo non emetta due scontrini — che sarebbe un corrispettivo
 * raddoppiato, cioè imposta pagata su incassi mai avvenuti.
 *
 * Può sollevare, e chi la chiama deve tenerne conto: va invocata DOPO aver
 * chiuso il tavolo e fuori dalla transazione. Dentro, un errore qualunque
 * abortirebbe la chiusura e il tavolo resterebbe occupato — in mezzo al
 * servizio è peggio di qualunque problema fiscale.
 */
export async function accodaDocumento(
  sql: Sql,
  sessionId: string
): Promise<{ accodato: boolean; motivo?: string }> {
  const [locale] = await sql`
    select v.id, v.rt_attivo, v.timezone, v.giornata_stacco_ora
      from table_sessions ts
      join venues v on v.id = ts.venue_id
     where ts.id = ${sessionId}`;

  if (!locale) return { accodato: false, motivo: "sessione non trovata" };
  if (!locale.rt_attivo) return { accodato: false, motivo: "registratore non attivo" };

  const conto = await contoSessione(sql, sessionId);
  if (!conto.haOrdinato) return { accodato: false, motivo: "niente da certificare" };

  const righe: RigaFiscale[] = conto.righe.map((r) => ({
    descrizione: r.nome,
    quantita: r.quantita,
    prezzoUnitarioCents: r.prezzoUnitarioCents,
    ivaPercent: r.ivaPercent,
  }));

  // L'aliquota di formula, coperto e servizio è quella impostata dal locale:
  // sono voci di somministrazione, non piatti, e il commercialista decide.
  const [v] = await sql`
    select service_vat_rate from venues where id = ${locale.id}`;
  const ivaServizi = Number(v?.service_vat_rate ?? 10);

  if (conto.aFormula) {
    if (conto.adulti > 0) {
      righe.push({
        descrizione: `Formula ${conto.fascia}`,
        quantita: conto.adulti,
        prezzoUnitarioCents: conto.formulaUnitarioCents,
        ivaPercent: ivaServizi,
      });
    }
    const prezzoBambino = conto.formulaBambinoCents ?? conto.formulaUnitarioCents;
    if (conto.bambini > 0 && prezzoBambino > 0) {
      righe.push({
        descrizione: `Formula ${conto.fascia} — bambini`,
        quantita: conto.bambini,
        prezzoUnitarioCents: prezzoBambino,
        ivaPercent: ivaServizi,
      });
    }
    if (conto.supplementoCents > 0) {
      righe.push({
        descrizione: "Supplemento",
        quantita: 1,
        prezzoUnitarioCents: conto.supplementoCents,
        ivaPercent: ivaServizi,
      });
    }
  }

  if (conto.copertoTotaleCents > 0) {
    righe.push({
      descrizione: conto.etichettaCoperto,
      quantita: conto.coperti,
      prezzoUnitarioCents: conto.copertoUnitarioCents,
      ivaPercent: ivaServizi,
    });
  }

  if (conto.servizioCents > 0) {
    righe.push({
      descrizione: `Servizio ${conto.servizioPercent}%`,
      quantita: 1,
      prezzoUnitarioCents: conto.servizioCents,
      ivaPercent: ivaServizi,
    });
  }

  /*
   * Il metodo di pagamento riga per riga.
   *
   * Dal 2026 il documento commerciale deve dire come è stato pagato, e non
   * basta il totale: un conto saldato metà in carta e metà in contanti va
   * dichiarato per quello che è.
   */
  const perMetodo = await sql`
    select method, sum(amount_cents)::int as tot
      from payments
     where table_session_id = ${sessionId} and status = 'succeeded'
     group by method`;

  const pagamenti: Record<string, number> = {};
  for (const p of perMetodo) pagamenti[p.method ?? "altro"] = Number(p.tot);

  const righeScritte = await sql`
    insert into fiscal_documents
      (venue_id, table_session_id, totale_cents, righe, pagamenti, service_date)
    select ${locale.id}, ${sessionId}, ${conto.dovutoCents},
           ${sql.json(righe as never)}, ${sql.json(pagamenti as never)},
           -- La giornata di servizio finisce quando la decide il locale: le
           -- cinque del mattino vanno bene a un ristorante, non a un bar che
           -- apre alle sei — i suoi primi caffè finirebbero in quella prima.
           ((now() at time zone coalesce(${locale.timezone}, 'Europe/Rome'))
             - make_interval(hours => ${locale.giornata_stacco_ora}))::date
    on conflict (table_session_id) where table_session_id is not null
    do nothing
    returning id`;

  return righeScritte.length > 0
    ? { accodato: true }
    : { accodato: false, motivo: "già in coda" };
}
