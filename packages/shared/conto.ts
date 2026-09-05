import "server-only";

/**
 * Il conto di un tavolo, calcolato in un posto solo.
 *
 * Prima l'aritmetica viveva in quattro punti — il conto sul telefono del
 * cliente, la chiusura in cassa, il residuo mostrato in sala, le righe della
 * fattura — e finché il conto era "somma dei piatti" le quattro copie
 * davano lo stesso numero per caso. Con la formula a prezzo fisso hanno
 * smesso: la sala chiedeva contanti che il sistema non registrava, la
 * fattura dichiarava piatti a listino che nessuno aveva pagato, e il
 * servizio si calcolava su due basi diverse a seconda di come si pagava.
 *
 * Un conto che dà numeri diversi a seconda di chi lo guarda non è un
 * dettaglio tecnico: è il cameriere che chiede al tavolo una cifra e la
 * cassa che ne registra un'altra.
 *
 * Prende il gestore SQL invece di aprirselo, così la chiusura del tavolo può
 * chiamarlo dentro la propria transazione e leggere gli stessi dati che sta
 * per scrivere.
 */

export interface RigaConto {
  /** Voci a pagamento: tutte alla carta, solo le fuori formula altrimenti. */
  id: string;
  nome: string;
  quantita: number;
  prezzoUnitarioCents: number;
  totaleCents: number;
  ivaPercent: number;
}

export interface Conto {
  /** Il tavolo paga a persona invece che a piatto. */
  aFormula: boolean;
  fascia: "pranzo" | "cena";
  formulaUnitarioCents: number;
  adulti: number;
  bambini: number;
  /** null = i bambini pagano come gli adulti. */
  formulaBambinoCents: number | null;
  supplementoCents: number;
  /** Adulti + bambini + supplemento. Zero alla carta. */
  formulaTotaleCents: number;

  /** Piatti effettivamente a pagamento. */
  righe: RigaConto[];
  righeTotaleCents: number;

  copertoUnitarioCents: number;
  coperti: number;
  copertoTotaleCents: number;
  etichettaCoperto: string;

  servizioPercent: number;
  servizioCents: number;

  /** Quanto il tavolo deve in tutto, prima dei pagamenti. */
  dovutoCents: number;
  pagatoCents: number;
  /** Mai negativo: quello che resta da incassare. */
  residuoCents: number;
  /** Quanto è stato pagato in più del dovuto, se è successo. */
  eccedenzaCents: number;
  /** Il tavolo ha ordinato qualcosa: senza, non deve niente. */
  haOrdinato: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Sql = any;

/**
 * Il conto di più tavoli in una volta sola.
 *
 * La sala mostra tutti i tavoli aperti insieme, e chiedere il conto uno per
 * uno voleva dire tre andate e ritorno per tavolo: dodici tavoli erano già
 * un secondo e mezzo, trenta sono quattro secondi — su una pagina che si
 * ricarica da sé mentre si lavora. Le regole restano queste, scritte una
 * volta: cambia solo che le tre query si fanno per tutti.
 */
export async function contiSessioni(
  sql: Sql,
  sessionIds: string[]
): Promise<Map<string, Conto>> {
  const esito = new Map<string, Conto>();
  if (sessionIds.length === 0) return esito;

  const tavoli = await sql`
    select ts.id,
           ts.guest_count, ts.bambini, ts.supplemento_cents, ts.formula,
           v.cover_charge_cents, v.cover_charge_label, v.service_percent,
           v.formula_attiva, v.formula_bambino_cents,
           case
             when (ts.opened_at at time zone coalesce(v.timezone, 'Europe/Rome'))::time
                  >= v.formula_ora_cena
             then v.formula_cena_cents else v.formula_pranzo_cents
           end as formula_unitario,
           (ts.opened_at at time zone coalesce(v.timezone, 'Europe/Rome'))::time
             >= v.formula_ora_cena as e_cena
      from table_sessions ts
      join venues v on v.id = ts.venue_id
     where ts.id = any(${sessionIds})`;

  const righeTutte = await sql`
    select o.table_session_id as sid, oi.id, mi.name as nome,
           oi.quantity as quantita, oi.unit_price_cents as prezzo,
           mi.vat_rate as iva, mi.fuori_formula
      from order_items oi
      join orders o on o.id = oi.order_id
      join menu_items mi on mi.id = oi.menu_item_id
     where o.table_session_id = any(${sessionIds})
       and o.status <> 'cancelled' and oi.status <> 'cancelled'
     order by mi.name`;

  const pagatiTutti = await sql`
    select table_session_id as sid, coalesce(sum(amount_cents), 0)::bigint as tot
      from payments
     where table_session_id = any(${sessionIds}) and status = 'succeeded'
     group by table_session_id`;

  const perSessione = new Map<string, any[]>();
  for (const r of righeTutte) {
    const l = perSessione.get(r.sid) ?? [];
    l.push(r);
    perSessione.set(r.sid, l);
  }

  const pagatoPer = new Map<string, number>();
  for (const p of pagatiTutti) pagatoPer.set(p.sid, Number(p.tot));

  for (const t of tavoli) {
    esito.set(
      t.id,
      componiConto(t, perSessione.get(t.id) ?? [], pagatoPer.get(t.id) ?? 0)
    );
  }

  return esito;
}

export async function contoSessione(sql: Sql, sessionId: string): Promise<Conto> {
  const conti = await contiSessioni(sql, [sessionId]);
  return conti.get(sessionId) ?? contoVuoto();
}

function contoVuoto(): Conto {
  return {
    aFormula: false,
    fascia: "cena",
    formulaUnitarioCents: 0,
    adulti: 0,
    bambini: 0,
    formulaBambinoCents: null,
    supplementoCents: 0,
    formulaTotaleCents: 0,
    righe: [],
    righeTotaleCents: 0,
    copertoUnitarioCents: 0,
    coperti: 1,
    copertoTotaleCents: 0,
    etichettaCoperto: "Coperto",
    servizioPercent: 0,
    servizioCents: 0,
    dovutoCents: 0,
    pagatoCents: 0,
    residuoCents: 0,
    eccedenzaCents: 0,
    haOrdinato: false,
  };
}

/**
 * Le regole, in un posto solo.
 *
 * Prende quello che è già stato letto dal database e ne ricava il conto: le
 * query stanno fuori perché conviene farle per tutti i tavoli insieme, ma
 * l'aritmetica non si duplica — è quella che, scritta due volte, ha fatto
 * dire alla sala centosessantotto euro mentre la cassa ne registrava
 * sessantaquattro.
 */
function componiConto(t: any, righeGrezze: any[], pagato: number): Conto {
  const unitario = Number(t.formula_unitario ?? 0);
  /*
   * La formula vale solo se ha un prezzo per la fascia in corso.
   *
   * Un locale che ha impostato la cena e non il pranzo, con un tavolo seduto
   * a mezzogiorno, non deve incassare zero: senza prezzo si torna alla
   * carta, che è un conto sbagliato per nessuno.
   */
  const aFormula = Boolean(t.formula && t.formula_attiva && unitario > 0);

  const coperti = Math.max(Number(t.guest_count ?? 1), 0);
  const bambini = Math.min(Math.max(Number(t.bambini ?? 0), 0), coperti);
  const adulti = Math.max(coperti - bambini, 0);
  const prezzoBambino =
    t.formula_bambino_cents === null || t.formula_bambino_cents === undefined
      ? null
      : Number(t.formula_bambino_cents);
  const supplemento = aFormula ? Number(t.supplemento_cents ?? 0) : 0;

  const formulaTotale = aFormula
    ? adulti * unitario + bambini * (prezzoBambino ?? unitario) + supplemento
    : 0;

  const haOrdinato = righeGrezze.length > 0;

  /*
   * A formula si pagano solo le voci fuori formula.
   *
   * Le comprese restano nell'ordine — la cucina le prepara, la sala le
   * porta — ma non si sommano al conto, o si pagherebbe due volte: una con
   * la formula e una a listino.
   */
  const righe: RigaConto[] = righeGrezze
    .filter((r) => !aFormula || r.fuori_formula)
    .map((r) => ({
      id: r.id,
      nome: r.nome,
      quantita: Number(r.quantita),
      prezzoUnitarioCents: Number(r.prezzo),
      totaleCents: Number(r.quantita) * Number(r.prezzo),
      ivaPercent: Number(r.iva ?? 10),
    }));

  const righeTotale = righe.reduce((s, r) => s + r.totaleCents, 0);

  /*
   * Coperto e servizio solo se il tavolo ha ordinato: un QR inquadrato per
   * curiosità apre una sessione, e non deve risultare a debito di due euro.
   */
  const copertoUnitario = haOrdinato ? Number(t.cover_charge_cents ?? 0) : 0;
  const copertoTotale = copertoUnitario * coperti;

  /*
   * Il servizio si calcola su quello che il tavolo paga davvero.
   *
   * Sull'ordinato pieno voleva dire, a formula, una percentuale su
   * centottanta euro di piatti compresi che nessuno ha pagato.
   */
  const servizioPercent = haOrdinato ? Number(t.service_percent ?? 0) : 0;
  const servizio = Math.round(((formulaTotale + righeTotale) * servizioPercent) / 100);

  const dovuto = formulaTotale + righeTotale + copertoTotale + servizio;
  const differenza = dovuto - pagato;

  return {
    aFormula,
    fascia: t.e_cena ? "cena" : "pranzo",
    formulaUnitarioCents: aFormula ? unitario : 0,
    adulti: aFormula ? adulti : 0,
    bambini: aFormula ? bambini : 0,
    formulaBambinoCents: aFormula ? prezzoBambino : null,
    supplementoCents: supplemento,
    formulaTotaleCents: formulaTotale,
    righe,
    righeTotaleCents: righeTotale,
    copertoUnitarioCents: copertoUnitario,
    coperti,
    copertoTotaleCents: copertoTotale,
    etichettaCoperto: (t.cover_charge_label ?? "").trim() || "Coperto",
    servizioPercent,
    servizioCents: servizio,
    dovutoCents: dovuto,
    pagatoCents: pagato,
    residuoCents: Math.max(differenza, 0),
    eccedenzaCents: Math.max(-differenza, 0),
    haOrdinato,
  };
}
