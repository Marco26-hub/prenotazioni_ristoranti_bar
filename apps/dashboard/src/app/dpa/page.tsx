import Link from "next/link";
import { DPA_VERSION, SOTTO_RESPONSABILI } from "@/lib/dpa";

export const metadata = {
  title: "Nomina a responsabile del trattamento",
  robots: { index: false, follow: true },
};

function Art({ n, titolo, children }: { n: string; titolo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border pt-4">
      <h2 className="font-semibold">
        {n}. {titolo}
      </h2>
      {children}
    </section>
  );
}

/**
 * Accordo art. 28 GDPR fra il locale (titolare) e il fornitore della
 * piattaforma (responsabile).
 *
 * Il testo è pubblico e versionato: il locale deve poterlo leggere prima di
 * accettarlo, e deve poter tornare a leggere esattamente la versione che ha
 * accettato.
 */
export default function DpaPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-8 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold tracking-tight">
        Nomina a responsabile del trattamento
      </h1>
      <p className="text-muted">
        Accordo ai sensi dell&apos;art. 28 del Regolamento (UE) 2016/679 —
        versione {DPA_VERSION}.
      </p>

      <p>
        Quando usi questo servizio, i dati dei tuoi clienti — ordini,
        pagamenti, prenotazioni, dati di fatturazione — restano{" "}
        <strong>tuoi</strong>. Tu sei il titolare del trattamento. Noi li
        trattiamo soltanto per farti funzionare il servizio, e questo accordo
        stabilisce entro quali limiti.
      </p>

      <Art n="1" titolo="Chi è chi">
        <p>
          <strong>Titolare del trattamento:</strong> il locale intestatario
          dell&apos;account, con i dati fiscali indicati in Impostazioni.
        </p>
        <p>
          <strong>Responsabile del trattamento:</strong> il fornitore della
          piattaforma, che tratta i dati esclusivamente su istruzione
          documentata del titolare.
        </p>
      </Art>

      <Art n="2" titolo="Oggetto, durata, natura del trattamento">
        <p>
          Il trattamento consiste nella raccolta, registrazione, conservazione,
          consultazione e cancellazione dei dati necessari a: mostrare il menu,
          ricevere ordini al tavolo, incassare pagamenti, gestire prenotazioni,
          emettere fatture elettroniche e, se collegata, trasmettere le comande
          alla cassa. Dura quanto il contratto di servizio.
        </p>
      </Art>

      <Art n="3" titolo="Categorie di interessati e di dati">
        <p>
          <strong>Interessati:</strong> i clienti del locale e il personale a
          cui il titolare dà accesso al gestionale.
        </p>
        <p>
          <strong>Dati:</strong> nome, telefono, email, dati di fatturazione
          (codice fiscale, partita IVA, codice destinatario, PEC), contenuto
          degli ordini e delle note, importi e esiti dei pagamenti, indirizzo IP
          pseudonimizzato per il contrasto agli abusi.
        </p>
        <p>
          Il servizio <strong>non è progettato per trattare categorie
          particolari di dati</strong> (art. 9): il titolare si impegna a non
          usarlo per raccogliere dati sulla salute. Le note dei clienti sono
          campi liberi in cui un cliente potrebbe scrivere un&apos;allergia di
          propria iniziativa; il titolare ne è consapevole e non ne sollecita
          l&apos;inserimento.
        </p>
      </Art>

      <Art n="4" titolo="Istruzioni del titolare">
        <p>
          Il responsabile tratta i dati solo su istruzione documentata del
          titolare, che comprende le operazioni rese possibili dalle funzioni
          del servizio così come configurate dal titolare stesso. Il
          responsabile informa immediatamente il titolare se un&apos;istruzione
          gli appare in contrasto con la normativa.
        </p>
        <p>
          Il responsabile <strong>non usa i dati dei clienti del locale per
          finalità proprie</strong>: non li rivende, non li aggrega per
          rivenderli, non li impiega per pubblicità, profilazione o
          addestramento di modelli.
        </p>
      </Art>

      <Art n="5" titolo="Riservatezza">
        <p>
          Chiunque acceda ai dati per conto del responsabile è vincolato alla
          riservatezza e autorizzato al trattamento nei limiti delle proprie
          mansioni.
        </p>
      </Art>

      <Art n="6" titolo="Misure di sicurezza (art. 32)">
        <ul className="list-disc space-y-1 pl-5">
          <li>Cifratura del traffico in transito (HTTPS obbligatorio).</li>
          <li>
            Credenziali del personale conservate solo come impronta (bcrypt),
            mai in chiaro.
          </li>
          <li>
            Segreti dei fornitori del locale (chiavi di pagamento e
            fatturazione) cifrati a riposo con AES-256-GCM.
          </li>
          <li>
            Separazione degli accessi per ruolo: sala e cucina non vedono
            incassi né dati fiscali.
          </li>
          <li>
            Isolamento dei dati fra locali verificato a ogni operazione, non
            solo nell&apos;interfaccia.
          </li>
          <li>
            Indirizzi IP pseudonimizzati con HMAC e conservati al massimo due
            ore.
          </li>
          <li>
            I dati delle carte non transitano mai dai sistemi del responsabile:
            sono raccolti direttamente dal fornitore di pagamento.
          </li>
          <li>Copie di sicurezza gestite dal fornitore della banca dati.</li>
        </ul>
      </Art>

      <Art n="7" titolo="Sotto-responsabili">
        <p>
          Il titolare autorizza in via generale il ricorso ai sotto-responsabili
          elencati qui sotto. Il responsabile comunica con almeno{" "}
          <strong>30 giorni</strong> di preavviso ogni aggiunta o sostituzione;
          entro quel termine il titolare può opporsi e, se l&apos;opposizione
          non è superabile, recedere dal servizio senza penali.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Fornitore</th>
                <th className="py-2 pr-3 font-medium">Attività</th>
                <th className="py-2 font-medium">Dove</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {SOTTO_RESPONSABILI.map((s) => (
                <tr key={s.nome} className="border-b border-border/70">
                  <td className="py-2 pr-3">{s.nome}</td>
                  <td className="py-2 pr-3">{s.attivita}</td>
                  <td className="py-2">{s.dove}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted">
          I fornitori di pagamento agiscono come <em>titolari autonomi</em> per
          i dati delle carte e per i propri obblighi antiriciclaggio, non come
          sotto-responsabili.
        </p>
      </Art>

      <Art n="8" titolo="Trasferimenti extra UE">
        <p>
          La banca dati risiede nell&apos;Unione Europea. Alcuni fornitori hanno
          capogruppo negli Stati Uniti e possono trattarvi dati: i trasferimenti
          avvengono sulla base delle clausole contrattuali tipo della
          Commissione europea e, ove applicabile, dell&apos;adeguatezza
          riconosciuta al quadro UE-USA.
        </p>
      </Art>

      <Art n="9" titolo="Assistenza al titolare">
        <p>
          Il responsabile assiste il titolare, tenuto conto della natura del
          trattamento, nel dare seguito alle richieste degli interessati (artt.
          15-22) e nell&apos;adempimento degli obblighi di sicurezza,
          notificazione delle violazioni e valutazione d&apos;impatto (artt.
          32-36). Le funzioni di esportazione e cancellazione disponibili nel
          gestionale sono parte di questa assistenza.
        </p>
      </Art>

      <Art n="10" titolo="Violazioni dei dati">
        <p>
          Il responsabile informa il titolare <strong>senza ingiustificato
          ritardo e comunque entro 48 ore</strong> da quando viene a conoscenza
          di una violazione, fornendo le informazioni necessarie alla
          notificazione al Garante entro le 72 ore previste dall&apos;art. 33.
          Resta in capo al titolare la decisione di notificare.
        </p>
      </Art>

      <Art n="11" titolo="Cancellazione a fine rapporto">
        <p>
          Alla cessazione del servizio il titolare può esportare i propri dati.
          Trascorsi <strong>60 giorni</strong> dalla cessazione, il responsabile
          cancella i dati dai sistemi attivi; le copie di sicurezza si
          sovrascrivono secondo il ciclo del fornitore della banca dati, entro
          ulteriori 35 giorni. Fanno eccezione i dati che una norma impone di
          conservare.
        </p>
      </Art>

      <Art n="12" titolo="Verifiche">
        <p>
          Il responsabile mette a disposizione del titolare le informazioni
          necessarie a dimostrare il rispetto dell&apos;art. 28 e consente
          verifiche, anche tramite un incaricato del titolare, con preavviso
          ragionevole e senza pregiudizio per la riservatezza degli altri
          locali che usano lo stesso servizio.
        </p>
      </Art>

      <Art n="13" titolo="Responsabilità del titolare">
        <p>
          Restano a carico del titolare: rendere l&apos;informativa ai propri
          clienti con i propri estremi, tenere il registro dei trattamenti,
          valutare la liceità delle finalità perseguite, gestire i rapporti con
          i propri dipendenti autorizzati e rispondere alle richieste degli
          interessati.
        </p>
      </Art>

      <p className="border-t border-border pt-4 text-muted">
        Questo testo è predisposto per l&apos;uso del servizio così com&apos;è
        realizzato. Non sostituisce il parere di un legale sulla situazione
        specifica del tuo locale, e in particolare sulle finalità per cui
        deciderai di usarlo.
      </p>

      <p>
        <Link href="/dashboard" className="underline underline-offset-2">
          Torna al gestionale
        </Link>
      </p>
    </main>
  );
}
