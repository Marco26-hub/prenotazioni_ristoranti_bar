export const metadata = { title: "Termini di servizio" };

export default function TerminiPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold tracking-tight">Termini di servizio</h1>

      <p className="rounded-lg border border-accent/40 bg-accent/10 p-3">
        BOZZA — punto di partenza tecnico, non un documento legale validato.
        Va rivisto da un legale prima della pubblicazione.
      </p>

      <h2 className="pt-2 font-semibold">Oggetto</h2>
      <p>
        Questo servizio permette di consultare il menu, inviare ordini al locale
        e pagare il conto dal proprio dispositivo. Il contratto di
        somministrazione è concluso direttamente con il locale, che resta
        l&apos;unico responsabile della preparazione, della qualità e della
        somministrazione di quanto ordinato.
      </p>

      <h2 className="pt-2 font-semibold">Ordini</h2>
      <p>
        L&apos;invio di un ordine dal tavolo equivale a una richiesta al locale.
        Eventuali modifiche o annullamenti vanno concordati direttamente con il
        personale di sala.
      </p>

      <h2 className="pt-2 font-semibold">Pagamenti</h2>
      <p>
        I pagamenti sono elaborati dai provider abilitati (Stripe, Satispay). Il
        pagamento si considera perfezionato quando il provider ne conferma
        l&apos;esito. Le somme sono incassate dal locale.
      </p>

      <h2 className="pt-2 font-semibold">Fattura elettronica</h2>
      <p>
        Se richiesta, la fattura è emessa dal locale e trasmessa al Sistema di
        Interscambio. È responsabilità di chi la richiede fornire dati fiscali
        corretti e completi.
      </p>

      <h2 className="pt-2 font-semibold">Rimborsi e contestazioni</h2>
      <p>
        Contestazioni su quanto ordinato, importi o rimborsi vanno rivolte
        direttamente al locale, che ne è la controparte contrattuale.
      </p>
    </main>
  );
}
