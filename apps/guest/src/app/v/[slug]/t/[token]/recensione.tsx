"use client";

import { useState } from "react";

/**
 * Recensione lasciata dal tavolo.
 *
 * Sta qui e non in una mail il giorno dopo perché il momento giusto è questo:
 * si è appena mangiato, il telefono è in mano e il menu è già aperto. Una
 * mail il giorno dopo ottiene una risposta su venti, e arriva quando non si
 * può più rimediare a niente.
 *
 * Il voto resta al locale. A chi dà cinque stelle si propone di scriverlo
 * anche pubblicamente; sotto le cinque si chiede cosa non è andato, e resta
 * una conversazione fra il cliente e il locale.
 */
export function Recensione({ token }: { token: string }) {
  const [voto, setVoto] = useState(0);
  const [passato, setPassato] = useState(0);
  const [commento, setCommento] = useState("");
  const [nome, setNome] = useState("");
  const [invio, setInvio] = useState(false);
  const [fatto, setFatto] = useState(false);
  const [linkPubblico, setLinkPubblico] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const mostrato = passato || voto;

  const ETICHETTE = [
    "",
    "Male",
    "Poco",
    "Nella media",
    "Bene",
    "Benissimo",
  ];

  async function invia() {
    if (voto === 0) return;
    setInvio(true);
    setErrore(null);
    try {
      const res = await fetch("/api/recensioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, voto, commento, nome }),
      });
      const dati = await res.json();
      if (!res.ok) {
        setErrore(dati.error ?? "Non è riuscito. Riprova fra poco.");
        return;
      }
      setLinkPubblico(dati.linkPubblico ?? null);
      setFatto(true);
    } catch {
      setErrore("Non è riuscito: controlla la connessione.");
    } finally {
      setInvio(false);
    }
  }

  if (fatto) {
    return (
      <section className="mt-5 rounded-xl border border-success bg-success/10 p-4">
        <p role="status" className="text-sm font-medium">
          {voto === 5
            ? "Grazie. Fa piacere davvero."
            : "Grazie: il titolare legge di persona, e sapere cosa non ha funzionato è l'unico modo per rimediare."}
        </p>
        {linkPubblico && (
          <>
            <p className="mt-2 text-sm text-muted">
              Se ti va di scriverlo anche pubblicamente, per noi conta molto:
            </p>
            <a
              href={linkPubblico}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground"
            >
              Scrivi una recensione pubblica
            </a>
          </>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Lascia la tua opinione"
      className="mt-5 rounded-xl border border-border bg-surface p-4"
    >
      <h2 className="text-base font-semibold">Com&apos;è andata?</h2>
      <p className="mt-0.5 text-sm text-muted">
        Lo legge il locale, non viene pubblicato da nessuna parte.
      </p>

      {/* Stelle grandi: si tocca con il pollice, seduti, spesso al buio. */}
      <div
        role="radiogroup"
        aria-label="Voto da 1 a 5"
        className="mt-3 flex items-center gap-1"
        onMouseLeave={() => setPassato(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={voto === n}
            aria-label={`${n} ${n === 1 ? "stella" : "stelle"}`}
            onClick={() => setVoto(n)}
            onMouseEnter={() => setPassato(n)}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-3xl leading-none transition-colors ${
              n <= mostrato ? "text-amber-500" : "text-border"
            }`}
          >
            <span aria-hidden>{n <= mostrato ? "★" : "☆"}</span>
          </button>
        ))}
        {mostrato > 0 && (
          <span className="ml-2 text-sm font-medium">{ETICHETTE[mostrato]}</span>
        )}
      </div>

      {/* Il resto compare dopo il voto: un modulo intero prima di aver
          toccato una stella scoraggia e basta. */}
      {voto > 0 && (
        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            {voto === 5 ? (
              "Vuoi aggiungere qualcosa?"
            ) : (
              <>
                <span className="font-medium">Cosa non è andato?</span>{" "}
                <span className="text-muted">
                  Scrivilo qui: lo legge il titolare, e su una cosa scritta
                  stasera si può ancora rimediare.
                </span>
              </>
            )}
            <textarea
              value={commento}
              onChange={(e) => setCommento(e.target.value)}
              rows={voto === 5 ? 3 : 4}
              maxLength={2000}
              placeholder={
                voto === 5
                  ? "Cosa ti è piaciuto di più?"
                  : "L'attesa, un piatto, il locale, il servizio…"
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
            />
          </label>

          <label className="block text-sm">
            Come ti chiami (se vuoi)
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={80}
              placeholder="Anche solo il nome"
              className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
            />
          </label>

          <button
            type="button"
            onClick={invia}
            disabled={invio}
            className="min-h-11 w-full rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            {invio
              ? "Invio…"
              : voto === 5
                ? "Manda al locale"
                : "Manda al titolare"}
          </button>
        </div>
      )}

      {errore && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {errore}
        </p>
      )}
    </section>
  );
}
