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
const ATTESA = Number(process.env.RT_ATTESA ?? 5) * 1000;
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

async function giro() {
  const r = await fetch(`${GESTIONALE}/api/rt/coda`, { headers: intestazioni });

  if (r.status === 401) {
    console.error(
      "Codice non riconosciuto. Ne è stato generato uno nuovo nel gestionale? " +
        "Rigeneralo e riavvia."
    );
    return;
  }
  if (!r.ok) {
    console.error(`gestionale non raggiungibile: HTTP ${r.status}`);
    return;
  }

  const { documenti, stampante } = await r.json();
  if (!documenti?.length) return;

  // Marca, operatore, percorso e reparti arrivano dal gestionale: cambiare
  // stampante non deve voler dire andare a modificare un file sulla cassa.
  const conf = stampante ?? { marca: "epson", operatore: 1, reparti: {} };
  if (!DIALETTI[conf.marca]) {
    console.error(
      `marca "${conf.marca}" non gestita da questo agente: uso il dialetto Epson`
    );
  }

  for (const doc of documenti) {
    try {
      const esito = await stampa(doc, conf);
      await fetch(`${GESTIONALE}/api/rt/esito`, {
        method: "POST",
        headers: intestazioni,
        body: JSON.stringify({ id: doc.id, esito: "emesso", ...esito }),
      });
      console.log(
        `emesso ${doc.id} — ${(doc.totaleCents / 100).toFixed(2)} € ` +
          `(doc. ${esito.numeroDocumento ?? "?"})`
      );
    } catch (e) {
      const messaggio = e instanceof Error ? e.message : "errore sconosciuto";
      // L'esito si riporta sempre, anche quando è un fallimento: un documento
      // lasciato "in corso" resta bloccato finché non scade, e intanto
      // nessuno sa che non è uscito.
      await fetch(`${GESTIONALE}/api/rt/esito`, {
        method: "POST",
        headers: intestazioni,
        body: JSON.stringify({ id: doc.id, esito: "errore", errore: messaggio }),
      }).catch(() => {});
      console.error(`NON emesso ${doc.id}: ${messaggio}`);
    }
  }
}

console.log(
  `Agente cassa avviato. Gestionale: ${GESTIONALE}. ` +
    (PROVA
      ? "Modalità prova: non stampa, mostra il tracciato."
      : `Stampante: ${STAMPANTE}. Marca e reparti li decide il gestionale.`)
);

// Un errore di rete non deve spegnere l'agente: il locale non se ne
// accorgerebbe fino a fine serata.
for (;;) {
  await giro().catch((e) =>
    console.error(`giro non riuscito: ${e instanceof Error ? e.message : e}`)
  );
  await new Promise((r) => setTimeout(r, ATTESA));
}
