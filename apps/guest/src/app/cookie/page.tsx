export const metadata = {
  title: "Informativa cookie",
  robots: { index: false, follow: true },
};

/**
 * Informativa cookie.
 *
 * Dice una cosa sola, ed è vera: non c'è nulla che richieda consenso.
 * Nessuna analitica, nessun pixel, nessun cookie di terze parti a fini
 * pubblicitari — verificato nel codice, non presunto. Per questo non c'è
 * banner: mostrarne uno dove non serve abitua le persone a cliccare
 * "accetta" senza leggere, e non rende nessuno più conforme.
 *
 * Se un giorno si aggiunge uno strumento di analisi, questa pagina va
 * riscritta e va introdotto un banner con consenso preventivo.
 */
export default function CookiePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold tracking-tight">Informativa cookie</h1>

      <p>
        Questo servizio <strong>non usa cookie di profilazione</strong>, non
        raccoglie statistiche di navigazione, non ospita pixel pubblicitari e
        non condivide dati con reti di advertising. Per questo non trovi un
        banner che ti chiede di accettare qualcosa: non c&apos;è nulla da
        accettare.
      </p>

      <h2 className="pt-3 font-semibold">Cosa viene effettivamente salvato</h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-3 font-medium">Nome</th>
              <th className="py-2 pr-3 font-medium">Chi lo imposta</th>
              <th className="py-2 pr-3 font-medium">A cosa serve</th>
              <th className="py-2 font-medium">Durata</th>
            </tr>
          </thead>
          <tbody className="align-top">
            <tr className="border-b border-border/70">
              <td className="py-2 pr-3">
                <code>__stripe_mid</code>, <code>__stripe_sid</code>
              </td>
              <td className="py-2 pr-3">Stripe, solo nella pagina di pagamento</td>
              <td className="py-2 pr-3">
                Riconoscere tentativi di frode con carta. Senza, il pagamento
                non può essere messo in sicurezza.
              </td>
              <td className="py-2">1 anno e 30 minuti</td>
            </tr>
            <tr>
              <td className="py-2 pr-3">
                <code>__Secure-authjs.session-token</code>
              </td>
              <td className="py-2 pr-3">
                Il gestionale del locale, non le pagine cliente
              </td>
              <td className="py-2 pr-3">
                Tenere collegato il personale dopo l&apos;accesso
              </td>
              <td className="py-2">12 ore</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Sono entrambi <strong>cookie tecnici</strong>: servono a erogare un
        servizio che hai chiesto tu — pagare in sicurezza, restare collegato — e
        secondo le Linee guida del Garante del 10 giugno 2021 non richiedono
        consenso preventivo. Le pagine che vedi al tavolo, quando non stai
        pagando, non impostano alcun cookie.
      </p>

      <h2 className="pt-3 font-semibold">Memoria del browser</h2>
      <p>
        Il servizio non usa <code>localStorage</code>, <code>sessionStorage</code>{" "}
        né impronte digitali del dispositivo. Il carrello vive nella pagina
        aperta e sparisce quando la chiudi.
      </p>

      <h2 className="pt-3 font-semibold">Come rimuoverli</h2>
      <p>
        I cookie tecnici si cancellano dalle impostazioni del browser, alla voce
        dati dei siti. Bloccando quelli di Stripe il pagamento con carta smette
        di funzionare: in quel caso puoi pagare al banco.
      </p>

      <h2 className="pt-3 font-semibold">Se qualcosa cambia</h2>
      <p>
        Se in futuro venisse introdotto uno strumento di misurazione o di
        marketing, questa pagina verrebbe aggiornata e comparirebbe una
        richiesta di consenso <em>prima</em> dell&apos;installazione, con la
        possibilità di rifiutare senza perdere l&apos;uso del servizio.
      </p>

      <p className="pt-4 text-muted">Ultimo aggiornamento: settembre 2026.</p>
    </main>
  );
}
