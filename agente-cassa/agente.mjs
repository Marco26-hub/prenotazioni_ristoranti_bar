#!/usr/bin/env node
/**
 * L'agente della cassa: svuota la coda dei documenti commerciali.
 *
 * Gira sul computer del locale, non sul nostro server, per una ragione sola:
 * la stampante fiscale sta sulla rete del ristorante e da fuori non la
 * raggiunge nessuno. Questo programma chiede al gestionale cosa c'è da
 * emettere, lo fa stampare al registratore, e racconta com'è andata.
 *
 * Non tiene niente di suo: se lo spegni, la coda resta al suo posto e riparte
 * da dov'era. Se lo accendi su due computer, i documenti non escono due volte
 * — è il gestionale a consegnarli uno solo per volta.
 *
 * Avvio:
 *   RT_CODICE=… RT_STAMPANTE=192.168.1.50 node agente.mjs
 *
 * Variabili:
 *   RT_CODICE      il codice generato in Corrispettivi (obbligatorio)
 *   RT_STAMPANTE   indirizzo della stampante sulla rete locale
 *   RT_GESTIONALE  di norma non serve cambiarlo
 *   RT_ATTESA      secondi fra un giro e l'altro (5)
 *   RT_PROVA       "1" per non stampare davvero: mostra cosa uscirebbe
 */

const CODICE = process.env.RT_CODICE;
const STAMPANTE = process.env.RT_STAMPANTE;
const GESTIONALE =
  process.env.RT_GESTIONALE ?? "https://ristoranti-dashboard.vercel.app";
/*
 * Ogni interrogazione si paga.
 *
 * A cinque secondi fissi sono 17.280 richieste al giorno per locale, quasi
 * tutte per sentirsi dire che non c'è niente da stampare: di notte, a
 * locale chiuso, con la stessa insistenza di mezzogiorno.
 *
 * Un documento fiscale non ha fretta al secondo — nessuno aspetta davanti
 * alla stampante — quindi si rallenta quando non c'è lavoro e si accelera
 * appena ne compare: dopo un documento si torna a pochi secondi, perché i
 * conti si chiudono a ondate e dietro al primo ne arrivano altri.
 *
 * A locale fermo sono 2.880 richieste al giorno invece di 17.280.
 */
const SVELTO = Number(process.env.RT_ATTESA ?? 3) * 1000;
const LENTO = Number(process.env.RT_ATTESA_FERMO ?? 30) * 1000;
// Quanti giri a vuoto prima di rallentare: un conto chiuso da poco fa
// spesso da apripista, e rallentare subito lo farebbe aspettare mezzo minuto.
const GIRI_PRIMA_DI_RALLENTARE = 5;
const PROVA = process.env.RT_PROVA === "1";

if (!CODICE) {
  console.error(
    "Manca RT_CODICE. Lo generi nel gestionale, in Corrispettivi, e si vede una volta sola."
  );
  process.exit(1);
}
if (!STAMPANTE && !PROVA) {
  console.error(
    "Manca RT_STAMPANTE: l'indirizzo del registratore sulla rete del locale.\n" +
      "Per provare senza stampare: RT_PROVA=1"
  );
  process.exit(1);
}

const intestazioni = {
  Authorization: `Bearer ${CODICE}`,
  "Content-Type": "application/json",
};

/**
 * Il reparto su cui va una riga, secondo la sua aliquota.
 *
 * Sulle stampanti fiscali italiane ogni aliquota IVA sta su un reparto
 * numerato, e la numerazione la decide chi ha configurato la stampante.
 * Mandare tutto sul reparto 1 significa dichiarare tutto con l'aliquota di
 * quel reparto: nessun errore a schermo, un errore fiscale in silenzio.
 *
 * Se il locale non ha ancora mappato le aliquote si usa il reparto 1 e lo si
 * dice nel log, invece di far finta di niente.
 */
function reparto(riga, reparti) {
  const chiave = String(riga.ivaPercent);
  const trovato = reparti?.[chiave] ?? reparti?.[String(Number(chiave))];
  if (trovato) return Number(trovato);
  if (!reparti || Object.keys(reparti).length === 0) return 1;
  console.warn(
    `  aliquota ${chiave}% non mappata a nessun reparto: uso il reparto 1, ` +
      "controlla i reparti in Corrispettivi"
  );
  return 1;
}

/** Contante o elettronico: dal 2026 il documento deve dirlo. */
function tipoPagamento(metodo) {
  return metodo === "cash" ? 0 : 2;
}

const pulisci = (t, max) => String(t).slice(0, max).replace(/[<>&"]/g, " ");
const euro = (c) => (Number(c) / 100).toFixed(2);

/*
 * I dialetti.
 *
 * Ogni marca ha il suo tracciato e il suo percorso HTTP. Aggiungerne una
 * significa aggiungere una voce qui: il resto del programma non sa cosa sia
 * una stampante, chiede solo "come si scrive" e "dove si manda".
 *
 * ATTENZIONE: nessuno di questi tracciati è stato provato su hardware vero.
 * Vanno confrontati con il manuale del modello prima del servizio, e fino ad
 * allora si usa RT_PROVA=1.
 */
const DIALETTI = {
  epson: {
    percorso: "/cgi-bin/fpmate.cgi",
    contentType: "text/xml; charset=utf-8",
    componi(doc, conf) {
      const op = conf.operatore ?? 1;
      const righe = doc.righe
        .map(
          (r) =>
            `<printRecItem operator="${op}" description="${pulisci(r.descrizione, 38)}" ` +
            `quantity="${r.quantita}" unitPrice="${euro(r.prezzoUnitarioCents)}" ` +
            `department="${reparto(r, conf.reparti)}" justification="1" />`
        )
        .join("\n  ");

      const pagamenti = Object.entries(doc.pagamenti ?? {})
        .map(
          ([metodo, cents]) =>
            `<printRecTotal operator="${op}" ` +
            `description="${metodo === "cash" ? "CONTANTE" : "ELETTRONICO"}" ` +
            `payment="${euro(cents)}" paymentType="${tipoPagamento(metodo)}" ` +
            `index="1" justification="1" />`
        )
        .join("\n  ");

      return `<?xml version="1.0" encoding="utf-8"?>
<printerFiscalReceipt>
  <beginFiscalReceipt operator="${op}" />
  ${righe}
  ${pagamenti}
  <endFiscalReceipt operator="${op}" />
</printerFiscalReceipt>`;
    },
    leggiEsito(testo) {
      if (/success="false"/i.test(testo)) {
        const codice = testo.match(/code="([^"]+)"/i)?.[1] ?? "?";
        throw new Error(`la stampante ha rifiutato il documento (codice ${codice})`);
      }
      return {
        numeroDocumento: testo.match(/fiscalReceiptNumber="([^"]+)"/i)?.[1] ?? null,
        matricola: testo.match(/serialNumber="([^"]+)"/i)?.[1] ?? null,
      };
    },
  },

  custom: {
    percorso: "/xml/printer.cgi",
    contentType: "text/xml; charset=utf-8",
    componi(doc, conf) {
      const righe = doc.righe
        .map(
          (r) =>
            `<printRecItem description="${pulisci(r.descrizione, 38)}" ` +
            `quantity="${r.quantita}" unitPrice="${euro(r.prezzoUnitarioCents)}" ` +
            `department="${reparto(r, conf.reparti)}" />`
        )
        .join("\n  ");

      const pagamenti = Object.entries(doc.pagamenti ?? {})
        .map(
          ([metodo, cents]) =>
            `<printRecTotal payment="${euro(cents)}" ` +
            `paymentType="${tipoPagamento(metodo)}" />`
        )
        .join("\n  ");

      return `<?xml version="1.0" encoding="utf-8"?>
<Service>
  <cmd>=K</cmd>
  <printerFiscalReceipt>
    <beginFiscalReceipt />
    ${righe}
    ${pagamenti}
    <endFiscalReceipt />
  </printerFiscalReceipt>
</Service>`;
    },
    leggiEsito(testo) {
      if (/<error/i.test(testo) || /status="[1-9]/i.test(testo)) {
        throw new Error(`la stampante ha risposto con un errore: ${pulisci(testo, 120)}`);
      }
      return {
        numeroDocumento: testo.match(/(?:zRepNumber|docNumber)="([^"]+)"/i)?.[1] ?? null,
        matricola: testo.match(/(?:serialNumber|matricola)="([^"]+)"/i)?.[1] ?? null,
      };
    },
  },

  rch: {
    percorso: "/service.cgi",
    contentType: "text/xml; charset=utf-8",
    componi(doc, conf) {
      const righe = doc.righe
        .map(
          (r) =>
            `<vendita descrizione="${pulisci(r.descrizione, 38)}" ` +
            `quantita="${r.quantita}" prezzo="${euro(r.prezzoUnitarioCents)}" ` +
            `reparto="${reparto(r, conf.reparti)}" />`
        )
        .join("\n  ");

      const pagamenti = Object.entries(doc.pagamenti ?? {})
        .map(
          ([metodo, cents]) =>
            `<pagamento tipo="${tipoPagamento(metodo)}" importo="${euro(cents)}" />`
        )
        .join("\n  ");

      return `<?xml version="1.0" encoding="utf-8"?>
<Scontrino>
  ${righe}
  ${pagamenti}
</Scontrino>`;
    },
    leggiEsito(testo) {
      if (/errore|error/i.test(testo)) {
        throw new Error(`la stampante ha risposto con un errore: ${pulisci(testo, 120)}`);
      }
      return {
        numeroDocumento: testo.match(/(?:numDoc|documento)="([^"]+)"/i)?.[1] ?? null,
        matricola: testo.match(/matricola="([^"]+)"/i)?.[1] ?? null,
      };
    },
  },
};

async function stampa(doc, conf) {
  const dialetto = DIALETTI[conf.marca] ?? DIALETTI.epson;
  const corpo = dialetto.componi(doc, conf);

  if (PROVA) {
    console.log(`\n--- documento ${doc.id} (${conf.marca}, prova: non stampato) ---`);
    console.log(corpo);
    return { numeroDocumento: `PROVA-${doc.id.slice(0, 8)}`, matricola: "PROVA" };
  }

  const percorso = conf.percorso || dialetto.percorso;
  const risposta = await fetch(`http://${STAMPANTE}${percorso}`, {
    method: "POST",
    headers: { "Content-Type": dialetto.contentType },
    body: corpo,
    signal: AbortSignal.timeout(20_000),
  });

  const testo = await risposta.text();
  // Un HTTP 200 da solo non vuol dire che lo scontrino sia uscito: la
  // stampante risponde comunque, e dentro dice se ha accettato.
  if (!risposta.ok) throw new Error(`stampante HTTP ${risposta.status}`);

  return dialetto.leggiEsito(testo);
}

/*
 * Esiti che il gestionale non ha ancora accettato.
 *
 * Se la linea cade fra la stampa e la comunicazione, lo scontrino e' gia'
 * uscito: l'esito va riprovato, non trasformato in un errore che farebbe
 * ristampare.
 */
const daRiportare = new Map();

/** Comunica l'esito. Vero se il gestionale l'ha accettato. */
async function riporta(id, corpo) {
  try {
    const r = await fetch(`${GESTIONALE}/api/rt/esito`, {
      method: "POST",
      headers: intestazioni,
      body: JSON.stringify({ id, ...corpo }),
      signal: AbortSignal.timeout(15_000),
    });
    // fetch non solleva sui 4xx e 5xx: senza questo controllo un 500 o un
    // 401 passavano per successo.
    return r.ok;
  } catch {
    return false;
  }
}

async function giro() {
  // Prima si riprovano gli esiti rimasti in sospeso: sono scontrini gia'
  // usciti, e finche' il gestionale non lo sa li considera da stampare.
  for (const [id, corpo] of [...daRiportare]) {
    if (await riporta(id, corpo)) {
      daRiportare.delete(id);
      console.log(`esito recuperato per ${id}`);
    }
  }

  const r = await fetch(`${GESTIONALE}/api/rt/coda`, { headers: intestazioni });

  if (r.status === 401) {
    console.error(
      "Codice non riconosciuto. Ne è stato generato uno nuovo nel gestionale? " +
        "Rigeneralo e riavvia."
    );
    return 0;
  }
  if (!r.ok) {
    console.error(`gestionale non raggiungibile: HTTP ${r.status}`);
    return 0;
  }

  const { documenti, stampante } = await r.json();
  if (!documenti?.length) return 0;

  // Marca, operatore, percorso e reparti arrivano dal gestionale: cambiare
  // stampante non deve voler dire andare a modificare un file sulla cassa.
  const conf = stampante ?? { marca: "epson", operatore: 1, reparti: {} };
  if (!DIALETTI[conf.marca]) {
    console.error(
      `marca "${conf.marca}" non gestita da questo agente: uso il dialetto Epson`
    );
  }

  for (const doc of documenti) {
    /*
     * Stampare e riportare l'esito sono due passi distinti, e vanno tenuti
     * separati.
     *
     * Con un try solo attorno a entrambi, uno scontrino gia' uscito dalla
     * stampante veniva dichiarato "non emesso" appena la linea del
     * ristorante cadeva un istante: il gestionale lo rimetteva in coda e al
     * giro dopo usciva una seconda volta. Due scontrini per lo stesso conto
     * sono un corrispettivo dichiarato due volte.
     */
    let stampato;
    try {
      stampato = await stampa(doc, conf);
    } catch (e) {
      const messaggio = e instanceof Error ? e.message : "errore sconosciuto";
      await riporta(doc.id, { esito: "errore", errore: messaggio });
      console.error(`NON stampato ${doc.id}: ${messaggio}`);
      continue;
    }

    if (PROVA) {
      // In prova non si tocca la coda: il documento resta da emettere.
      // Marcarlo "emesso" con un numero finto vorrebbe dire dichiarare
      // certificati degli incassi che nessuno ha certificato, e da li' non
      // se ne accorge piu' nessuno.
      console.log(
        `PROVA ${doc.id} — ${(doc.totaleCents / 100).toFixed(2)} € ` +
          "(lasciato in coda: nessuna certificazione)"
      );
      continue;
    }

    const riportato = await riporta(doc.id, {
      esito: "emesso",
      ...stampato,
    });

    if (riportato) {
      console.log(
        `emesso ${doc.id} — ${(doc.totaleCents / 100).toFixed(2)} € ` +
          `(doc. ${stampato.numeroDocumento ?? "?"})`
      );
    } else {
      // Lo scontrino e' uscito ma il gestionale non lo sa: va detto forte,
      // perche' e' l'unico caso in cui serve una persona.
      console.error(
        `STAMPATO ma non registrato ${doc.id} (doc. ${stampato.numeroDocumento ?? "?"}): ` +
          "segnalo al gestionale al prossimo giro; se resta cosi', segnalo a mano " +
          "in Corrispettivi come battuto in cassa per non farlo ristampare."
      );
      daRiportare.set(doc.id, { esito: "emesso", ...stampato });
    }
  }

  return documenti.length;
}

console.log(
  `Agente cassa avviato. Gestionale: ${GESTIONALE}. ` +
    (PROVA
      ? "Modalità prova: non stampa, mostra il tracciato."
      : `Stampante: ${STAMPANTE}. Marca e reparti li decide il gestionale.`) +
    ` Controlla ogni ${SVELTO / 1000}s quando c'è lavoro, ogni ${LENTO / 1000}s quando è fermo.`
);

// Un errore di rete non deve spegnere l'agente: il locale non se ne
// accorgerebbe fino a fine serata.
let giriAVuoto = 0;

for (;;) {
  const fatti = await giro().catch((e) => {
    console.error(`giro non riuscito: ${e instanceof Error ? e.message : e}`);
    return 0;
  });

  giriAVuoto = fatti > 0 ? 0 : giriAVuoto + 1;
  const attesa = giriAVuoto >= GIRI_PRIMA_DI_RALLENTARE ? LENTO : SVELTO;

  await new Promise((r) => setTimeout(r, attesa));
}
