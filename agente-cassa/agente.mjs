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
 * Il documento nel dialetto XML delle stampanti Epson fiscali.
 *
 * Ogni marca ha il suo: Custom e RCH parlano diverso. Qui c'è Epson perché è
 * la più diffusa nei locali italiani; per le altre si cambia questa funzione
 * e basta, il resto del programma non sa cosa sia una stampante.
 *
 * ATTENZIONE: questo dialetto non è stato provato su una stampante vera —
 * il tracciato va confrontato con il manuale del modello che hai prima di
 * usarlo in servizio. Fino ad allora, RT_PROVA=1.
 */
function documentoXml(doc) {
  const righe = doc.righe
    .map((r) => {
      const descrizione = String(r.descrizione)
        .slice(0, 38)
        .replace(/[<>&"]/g, " ");
      const prezzo = (r.prezzoUnitarioCents / 100).toFixed(2);
      return (
        `<printRecItem operator="1" description="${descrizione}" ` +
        `quantity="${r.quantita}" unitPrice="${prezzo}" ` +
        `department="1" justification="1" />`
      );
    })
    .join("");

  /*
   * Il pagamento va dichiarato per quello che è.
   *
   * Dal 2026 il documento commerciale deve riportare il mezzo usato, e
   * l'Agenzia incrocia gli importi con i dati degli acquirer: battere una
   * carta come contante non è un dettaglio, è uno scostamento che genera un
   * controllo. paymentType 0 = contante, 2 = elettronico.
   */
  const pagamenti = Object.entries(doc.pagamenti ?? {})
    .map(([metodo, centesimi]) => {
      const tipo = metodo === "cash" ? "0" : "2";
      const importo = (Number(centesimi) / 100).toFixed(2);
      return (
        `<printRecTotal operator="1" description="${metodo === "cash" ? "CONTANTE" : "ELETTRONICO"}" ` +
        `payment="${importo}" paymentType="${tipo}" index="1" justification="1" />`
      );
    })
    .join("");

  return `<?xml version="1.0" encoding="utf-8"?>
<printerFiscalReceipt>
  <beginFiscalReceipt operator="1" />
  ${righe}
  ${pagamenti}
  <endFiscalReceipt operator="1" />
</printerFiscalReceipt>`;
}

async function stampa(doc) {
  if (PROVA) {
    console.log(`\n--- documento ${doc.id} (prova, non stampato) ---`);
    console.log(documentoXml(doc));
    return { numeroDocumento: `PROVA-${doc.id.slice(0, 8)}`, matricola: "PROVA" };
  }

  const risposta = await fetch(`http://${STAMPANTE}/cgi-bin/fpmate.cgi`, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body: documentoXml(doc),
    signal: AbortSignal.timeout(20_000),
  });

  const testo = await risposta.text();
  if (!risposta.ok) throw new Error(`stampante HTTP ${risposta.status}`);

  // La stampante risponde con success="true|false": un HTTP 200 da solo non
  // vuol dire che lo scontrino sia uscito.
  if (/success="false"/i.test(testo)) {
    const codice = testo.match(/code="([^"]+)"/i)?.[1] ?? "?";
    throw new Error(`la stampante ha rifiutato il documento (codice ${codice})`);
  }

  return {
    numeroDocumento: testo.match(/fiscalReceiptNumber="([^"]+)"/i)?.[1] ?? null,
    matricola: testo.match(/serialNumber="([^"]+)"/i)?.[1] ?? null,
  };
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

  const { documenti } = await r.json();
  if (!documenti?.length) return;

  for (const doc of documenti) {
    try {
      const esito = await stampa(doc);
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
    (PROVA ? "Modalità prova: non stampa." : `Stampante: ${STAMPANTE}.`)
);

// Un errore di rete non deve spegnere l'agente: il locale non se ne
// accorgerebbe fino a fine serata.
for (;;) {
  await giro().catch((e) =>
    console.error(`giro non riuscito: ${e instanceof Error ? e.message : e}`)
  );
  await new Promise((r) => setTimeout(r, ATTESA));
}
