import Link from "next/link";
import { SOTTO_RESPONSABILI } from "@/lib/dpa";

export const metadata = {
  title: "Informativa privacy — account del locale",
  robots: { index: false, follow: true },
};

/**
 * Informativa verso il ristoratore.
 *
 * Qui i ruoli si invertono rispetto alla /privacy dell'app cliente: per i
 * dati dell'account — email, password, fatturazione dell'abbonamento — il
 * titolare siamo noi, non il locale. Tenerle separate evita l'errore
 * comune di un unico documento che confonde i due rapporti.
 */
function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border pt-4">
      <h2 className="font-semibold">{titolo}</h2>
      {children}
    </section>
  );
}

export default function PrivacyGestionalePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-8 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold tracking-tight">
        Informativa privacy — il tuo account
      </h1>

      <p className="text-muted">
        Riguarda i dati del <strong>tuo account e della tua attività</strong>.
        Per i dati dei <em>tuoi clienti</em> il titolare sei tu: quel rapporto è
        regolato dalla{" "}
        <Link href="/dpa" className="underline underline-offset-2">
          nomina a responsabile del trattamento
        </Link>
        .
      </p>

      <Sezione titolo="Titolare">
        <p>
          Il fornitore della piattaforma, i cui estremi completi — ragione
          sociale, sede, partita IVA e indirizzo per l&apos;esercizio dei
          diritti — vanno indicati qui prima della commercializzazione.
        </p>
      </Sezione>

      <Sezione titolo="Dati trattati e finalità">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Dati</th>
                <th className="py-2 pr-3 font-medium">Finalità</th>
                <th className="py-2 pr-3 font-medium">Base giuridica</th>
                <th className="py-2 font-medium">Conservazione</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-border/70">
                <td className="py-2 pr-3">
                  Email, nome, impronta della password del personale
                </td>
                <td className="py-2 pr-3">Accesso al gestionale</td>
                <td className="py-2 pr-3">Contratto — art. 6.1.b</td>
                <td className="py-2">Fino a 60 giorni dalla chiusura account</td>
              </tr>
              <tr className="border-b border-border/70">
                <td className="py-2 pr-3">
                  Ragione sociale, sede, partita IVA, dati dell&apos;abbonamento
                </td>
                <td className="py-2 pr-3">
                  Fatturare il canone e gestire il rapporto
                </td>
                <td className="py-2 pr-3">
                  Contratto e obbligo legale — artt. 6.1.b e 6.1.c
                </td>
                <td className="py-2">10 anni</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">
                  Indirizzo IP pseudonimizzato al momento della registrazione
                </td>
                <td className="py-2 pr-3">Impedire registrazioni automatiche</td>
                <td className="py-2 pr-3">
                  Legittimo interesse alla sicurezza — art. 6.1.f
                </td>
                <td className="py-2">Massimo 2 ore</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          I dati della tua carta per il pagamento del canone sono raccolti
          direttamente da Stripe e non transitano dai nostri sistemi:
          conserviamo solo l&apos;identificativo del cliente, l&apos;esito e la
          scadenza dell&apos;abbonamento.
        </p>
      </Sezione>

      <Sezione titolo="Fornitori">
        <ul className="list-disc space-y-1 pl-5">
          {SOTTO_RESPONSABILI.map((s) => (
            <li key={s.nome}>
              <strong>{s.nome}</strong> — {s.attivita} ({s.dove}).
            </li>
          ))}
          <li>
            <strong>Stripe</strong> — incasso del canone, come titolare autonomo
            per i dati di pagamento.
          </li>
        </ul>
        <p>
          Non vendiamo i tuoi dati, non li cediamo a fini pubblicitari e non li
          usiamo per profilazione o decisioni automatizzate.
        </p>
      </Sezione>

      <Sezione titolo="I tuoi diritti">
        <p>
          Accesso, rettifica, cancellazione, limitazione, portabilità e
          opposizione ai sensi degli artt. 15-22 GDPR, e reclamo al{" "}
          <strong>Garante per la protezione dei dati personali</strong> (Piazza
          Venezia 11, 00187 Roma — garante@gpdp.it).
        </p>
        <p>
          La cancellazione dell&apos;account non elimina i documenti fiscali,
          che una norma impone di conservare.
        </p>
      </Sezione>

      <Sezione titolo="Cookie">
        <p>
          Il gestionale usa un solo cookie, quello di sessione, necessario a
          tenerti collegato dopo l&apos;accesso. Nessuna analitica, nessun
          tracciamento, nessun banner.
        </p>
      </Sezione>

      <p className="pt-4 text-muted">Ultimo aggiornamento: settembre 2026.</p>
    </main>
  );
}
