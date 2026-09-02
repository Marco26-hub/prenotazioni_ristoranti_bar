import Link from "next/link";

export const metadata = {
  title: "Informativa privacy",
  robots: { index: false, follow: true },
};

/**
 * Informativa generica, raggiungibile solo digitando il dominio a mano.
 *
 * Non prova a fare da informativa vera: il titolare del trattamento è il
 * singolo locale, e un documento che non lo nomina non soddisfa
 * l'art. 13.1.a. Qui si dice come arrivare a quella giusta.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold tracking-tight">Informativa privacy</h1>

      <p>
        Questa piattaforma è usata da molti ristoranti e bar, ognuno dei quali
        è <strong>titolare autonomo</strong> del trattamento dei dati dei propri
        clienti. Non esiste quindi un&apos;informativa unica: quella che ti
        riguarda è del locale presso cui hai ordinato, pagato o prenotato.
      </p>

      <h2 className="pt-3 font-semibold">Come trovare quella giusta</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Dalla pagina del tuo tavolo o dal menu del locale, in fondo, alla voce{" "}
          <em>Privacy</em>.
        </li>
        <li>
          Oppure all&apos;indirizzo <code>/privacy/</code> seguito dal nome del
          locale come compare nel link del menu.
        </li>
      </ul>

      <h2 className="pt-3 font-semibold">Il ruolo di chi gestisce la piattaforma</h2>
      <p>
        Il fornitore della piattaforma tratta i dati esclusivamente per conto
        dei locali e secondo le loro istruzioni, in qualità di responsabile del
        trattamento nominato ai sensi dell&apos;art. 28 GDPR. Non usa i dati dei
        clienti dei locali per finalità proprie, non li rivende e non li impiega
        per pubblicità o profilazione.
      </p>

      <h2 className="pt-3 font-semibold">Cookie</h2>
      <p>
        Vale per tutti i locali ed è descritto nella{" "}
        <Link href="/cookie" className="underline underline-offset-2">
          informativa cookie
        </Link>
        : nessun cookie di profilazione, nessuna analitica, nessun banner.
      </p>

      <h2 className="pt-3 font-semibold">Reclami</h2>
      <p>
        Puoi rivolgerti al <strong>Garante per la protezione dei dati
        personali</strong>, Piazza Venezia 11, 00187 Roma — garante@gpdp.it.
      </p>

      <p className="pt-4 text-muted">Ultimo aggiornamento: settembre 2026.</p>
    </main>
  );
}
