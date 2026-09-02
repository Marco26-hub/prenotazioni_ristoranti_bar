import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";

/**
 * Informativa privacy del singolo locale.
 *
 * Il titolare del trattamento è il locale, non noi: un'informativa unica e
 * generica non sarebbe conforme, perché l'interessato ha diritto di sapere
 * a chi rivolgersi (art. 13.1.a GDPR). I dati del titolare vengono quindi
 * dalla scheda del locale, e dove mancano il documento lo dichiara invece
 * di far finta che ci siano.
 */

interface VenuePrivacy {
  name: string;
  vat_number: string | null;
  fiscal_code: string | null;
  address: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_province: string | null;
  public_email: string | null;
  public_phone: string | null;
  pec: string | null;
  brand_color: string | null;
}

async function loadVenue(slug: string): Promise<VenuePrivacy | null> {
  const sql = db();
  const [v] = await sql<VenuePrivacy[]>`
    select name, vat_number, fiscal_code, address, address_zip, address_city,
           address_province, public_email, public_phone, pec, brand_color
      from venues where slug = ${slug}`;
  return v ?? null;
}

export async function generateMetadata({
  params,
}: PageProps<"/privacy/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const v = await loadVenue(slug);
  return {
    title: v ? `Informativa privacy — ${v.name}` : "Informativa privacy",
    // Un'informativa non è contenuto da posizionare: è un documento di
    // servizio, e indicizzarla disperde l'autorità delle pagine che contano.
    robots: { index: false, follow: true },
  };
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="pt-3 font-semibold">{titolo}</h2>
      {children}
    </section>
  );
}

export default async function PrivacyLocalePage({
  params,
}: PageProps<"/privacy/[slug]">) {
  const { slug } = await params;
  const venue = await loadVenue(slug);
  if (!venue) notFound();

  const indirizzo = [
    venue.address,
    venue.address_zip,
    venue.address_city,
    venue.address_province && `(${venue.address_province})`,
  ]
    .filter(Boolean)
    .join(" ");

  const contatti = [venue.public_email, venue.pec, venue.public_phone].filter(Boolean);
  const identificativo = venue.vat_number
    ? `P. IVA ${venue.vat_number}`
    : venue.fiscal_code
      ? `C.F. ${venue.fiscal_code}`
      : null;

  const incompleto = !indirizzo || contatti.length === 0 || !identificativo;

  return (
    <main
      className="mx-auto max-w-2xl space-y-4 px-4 py-6 text-sm leading-relaxed"
      style={
        venue.brand_color
          ? ({ "--accent": venue.brand_color } as React.CSSProperties)
          : undefined
      }
    >
      <h1 className="text-2xl font-semibold tracking-tight">Informativa privacy</h1>
      <p className="text-muted">
        Come <strong>{venue.name}</strong> tratta i tuoi dati quando ordini,
        paghi o prenoti da questo servizio. Ai sensi degli articoli 13 e 14 del
        Regolamento (UE) 2016/679.
      </p>

      <Sezione titolo="Chi tratta i tuoi dati">
        <p>
          Il titolare del trattamento è <strong>{venue.name}</strong>
          {identificativo ? `, ${identificativo}` : ""}
          {indirizzo ? `, con sede in ${indirizzo}` : ""}.
        </p>
        {contatti.length > 0 ? (
          <p>Per esercitare i tuoi diritti puoi scrivere a: {contatti.join(" — ")}.</p>
        ) : (
          <p>
            I recapiti per l&apos;esercizio dei diritti non sono ancora stati
            indicati dal locale: chiedili direttamente al personale.
          </p>
        )}
        {incompleto && (
          <p className="rounded-lg border border-border bg-surface p-3 text-muted">
            Alcuni estremi del titolare non risultano compilati. Il personale
            del locale può fornirteli su richiesta.
          </p>
        )}
        <p>
          Il gestore della piattaforma tratta i dati per conto del locale, in
          qualità di responsabile del trattamento nominato ai sensi
          dell&apos;art. 28 GDPR.
        </p>
      </Sezione>

      <Sezione titolo="Quali dati, per farne cosa, e con quale base giuridica">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
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
                  Piatti ordinati, quantità, note per la cucina, importi
                </td>
                <td className="py-2 pr-3">Prendere e servire il tuo ordine</td>
                <td className="py-2 pr-3">
                  Esecuzione del contratto — art. 6.1.b
                </td>
                <td className="py-2">
                  Con i dati contabili del locale, per i termini di legge
                </td>
              </tr>
              <tr className="border-b border-border/70">
                <td className="py-2 pr-3">Esito del pagamento, importo, metodo</td>
                <td className="py-2 pr-3">Incassare il conto e chiudere il tavolo</td>
                <td className="py-2 pr-3">
                  Esecuzione del contratto — art. 6.1.b
                </td>
                <td className="py-2">10 anni (art. 2220 c.c.)</td>
              </tr>
              <tr className="border-b border-border/70">
                <td className="py-2 pr-3">
                  Dati di fatturazione: codice fiscale o partita IVA, codice
                  destinatario o PEC
                </td>
                <td className="py-2 pr-3">
                  Emettere la fattura elettronica e trasmetterla al Sistema di
                  Interscambio
                </td>
                <td className="py-2 pr-3">Obbligo legale — art. 6.1.c</td>
                <td className="py-2">10 anni</td>
              </tr>
              <tr className="border-b border-border/70">
                <td className="py-2 pr-3">
                  Prenotazione: nome, telefono, email, numero di persone,
                  richieste particolari
                </td>
                <td className="py-2 pr-3">Gestire la prenotazione del tavolo</td>
                <td className="py-2 pr-3">
                  Esecuzione di misure precontrattuali — art. 6.1.b
                </td>
                <td className="py-2">
                  Fino a 24 mesi dalla data prenotata, poi cancellata
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-3">
                  Indirizzo IP, in forma pseudonimizzata e non riconducibile a
                  te senza una chiave che non è conservata insieme al dato
                </td>
                <td className="py-2 pr-3">
                  Impedire invii ripetuti e abusi sui moduli pubblici
                </td>
                <td className="py-2 pr-3">
                  Legittimo interesse alla sicurezza — art. 6.1.f
                </td>
                <td className="py-2">Massimo 2 ore</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-muted">
          Se scrivi una richiesta particolare nella prenotazione o una nota per
          la cucina, evita di indicare informazioni sulla salute. Per allergie e
          intolleranze parlane a voce con il personale: è più sicuro e non
          lascia un dato sanitario scritto.
        </p>
      </Sezione>

      <Sezione titolo="I dati della tua carta">
        <p>
          I dati della carta non passano mai dai sistemi del locale né da questa
          piattaforma: vengono inseriti direttamente nei moduli del fornitore di
          pagamento, che li tratta come titolare autonomo secondo la propria
          informativa. Il locale riceve solo l&apos;esito, l&apos;importo e le
          ultime cifre del metodo usato.
        </p>
      </Sezione>

      <Sezione titolo="A chi vengono comunicati">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Fornitore della piattaforma</strong> — responsabile del
            trattamento, per il funzionamento del servizio.
          </li>
          <li>
            <strong>Fornitore di hosting e banca dati</strong> — i dati sono
            ospitati su server nell&apos;Unione Europea (Francoforte).
          </li>
          <li>
            <strong>Fornitore di pagamento</strong> (Stripe, Satispay) —
            titolare autonomo per i dati di pagamento.
          </li>
          <li>
            <strong>Intermediario per la fatturazione elettronica</strong>, solo
            se richiedi la fattura, e di conseguenza{" "}
            <strong>l&apos;Agenzia delle Entrate</strong> tramite il Sistema di
            Interscambio.
          </li>
          <li>
            <strong>Software di cassa del locale</strong>, se collegato, per
            trasmettere la comanda.
          </li>
        </ul>
        <p>
          I dati non vengono venduti, ceduti a fini pubblicitari, né usati per
          profilazione o decisioni automatizzate.
        </p>
      </Sezione>

      <Sezione titolo="Trasferimenti fuori dall'Unione Europea">
        <p>
          La banca dati risiede nell&apos;Unione Europea. Alcuni fornitori
          tecnici — in particolare quello di hosting applicativo e quello di
          pagamento — hanno società capogruppo negli Stati Uniti e possono
          trattare dati anche lì. Questi trasferimenti avvengono sulla base
          delle clausole contrattuali tipo approvate dalla Commissione europea
          e, ove applicabile, dell&apos;adeguatezza riconosciuta al quadro
          UE-USA per la protezione dei dati.
        </p>
      </Sezione>

      <Sezione titolo="Cookie e tecnologie simili">
        <p>
          Questo servizio non usa cookie di profilazione, di analisi statistica
          né di terze parti a fini pubblicitari, e non installa alcun cookie che
          richieda il tuo consenso. Il dettaglio è nella{" "}
          <a href="/cookie" className="underline underline-offset-2">
            informativa cookie
          </a>
          .
        </p>
      </Sezione>

      <Sezione titolo="I tuoi diritti">
        <p>
          Puoi chiedere in ogni momento l&apos;accesso ai tuoi dati, la
          rettifica, la cancellazione, la limitazione del trattamento, la
          portabilità, e opporti al trattamento fondato sul legittimo interesse
          (artt. 15-22 GDPR). Le richieste vanno rivolte al titolare, ai
          recapiti indicati sopra; il fornitore della piattaforma assiste il
          locale nel darvi seguito.
        </p>
        <p>
          Alcuni dati non possono essere cancellati su richiesta finché dura
          l&apos;obbligo di conservarli: è il caso dei documenti contabili e
          fiscali.
        </p>
        <p>
          Se ritieni che il trattamento violi il Regolamento puoi proporre
          reclamo al <strong>Garante per la protezione dei dati personali</strong>{" "}
          (Piazza Venezia 11, 00187 Roma — garante@gpdp.it) o rivolgerti
          all&apos;autorità giudiziaria.
        </p>
      </Sezione>

      <Sezione titolo="Conferimento dei dati">
        <p>
          Il conferimento è facoltativo, ma senza i dati indicati come
          necessari non è possibile prendere l&apos;ordine, incassare il conto,
          emettere la fattura o registrare la prenotazione.
        </p>
      </Sezione>

      <p className="pt-4 text-muted">
        Ultimo aggiornamento: settembre 2026.
      </p>
    </main>
  );
}
