export const metadata = { title: "Informativa privacy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 text-sm">
      <h1 className="text-xl font-semibold">Informativa privacy</h1>

      <p className="rounded border border-amber-500 bg-amber-50 p-3 text-amber-900">
        BOZZA — questo testo è un punto di partenza tecnico, non un documento
        legale validato. Va rivisto da un legale e completato con i dati reali
        del titolare del trattamento prima della pubblicazione.
      </p>

      <h2 className="font-medium">Titolare del trattamento</h2>
      <p>
        Il titolare è il locale presso cui stai ordinando, i cui estremi
        completi (ragione sociale, sede, P.IVA, contatti) devono essere
        indicati qui.
      </p>

      <h2 className="font-medium">Dati raccolti e finalità</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Ordini e pagamenti</strong>: articoli ordinati, importi, esito del
          pagamento. Servono a erogare il servizio richiesto e ad adempiere agli
          obblighi contabili e fiscali.
        </li>
        <li>
          <strong>Dati di fatturazione</strong> (nome, cognome, codice fiscale oppure
          ragione sociale e partita IVA): trattati solo se richiedi la fattura
          elettronica, per l&apos;emissione e la trasmissione al Sistema di
          Interscambio dell&apos;Agenzia delle Entrate.
        </li>
        <li>
          <strong>Prenotazioni</strong> (nome, telefono, email): per gestire la
          prenotazione del tavolo.
        </li>
      </ul>

      <h2 className="font-medium">Base giuridica</h2>
      <p>
        Esecuzione del contratto (art. 6.1.b GDPR) per ordini, pagamenti e
        prenotazioni; obbligo legale (art. 6.1.c GDPR) per fatturazione e
        conservazione dei documenti fiscali.
      </p>

      <h2 className="font-medium">Destinatari</h2>
      <p>
        I dati sono comunicati ai fornitori tecnici necessari all&apos;erogazione
        del servizio, in qualità di responsabili del trattamento: il provider di
        pagamento scelto (Stripe o Satispay), il provider di fatturazione
        elettronica accreditato SDI, e il fornitore di hosting e database.
        I dati fiscali sono inoltre trasmessi all&apos;Agenzia delle Entrate come
        previsto dalla normativa.
      </p>

      <h2 className="font-medium">Conservazione</h2>
      <p>
        I documenti fiscali sono conservati per i termini di legge (10 anni
        civilistici); i dati di prenotazione per il tempo necessario alla
        gestione del servizio.
      </p>

      <h2 className="font-medium">Diritti dell&apos;interessato</h2>
      <p>
        Puoi chiedere accesso, rettifica, cancellazione, limitazione e
        portabilità dei dati, e proporre reclamo al Garante per la protezione
        dei dati personali. Le richieste vanno inviate ai contatti del titolare
        indicati sopra.
      </p>
    </main>
  );
}
