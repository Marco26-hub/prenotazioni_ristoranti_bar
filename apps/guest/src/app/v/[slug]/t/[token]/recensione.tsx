"use client";

import { useState } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tTavoloExtra } from "@/i18n/tavolo-extra";

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
  const t = tTavoloExtra(useLingua());
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
    t("recensione.voto.1"),
    t("recensione.voto.2"),
    t("recensione.voto.3"),
    t("recensione.voto.4"),
    t("recensione.voto.5"),
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
        setErrore(dati.error ?? t("recensione.errore.invio"));
        return;
      }
      setLinkPubblico(dati.linkPubblico ?? null);
      setFatto(true);
    } catch {
      setErrore(t("recensione.errore.rete"));
    } finally {
      setInvio(false);
    }
  }

  if (fatto) {
    return (
      <section className="mt-5 rounded-xl border border-success bg-success/10 p-4">
        <p role="status" className="text-sm font-medium">
          {voto === 5
            ? t("recensione.grazie.alto")
            : t("recensione.grazie.basso")}
        </p>
        {linkPubblico && (
          <>
            <p className="mt-2 text-sm text-muted">
              {t("recensione.pubblica.invito")}
            </p>
            <a
              href={linkPubblico}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground"
            >
              {t("recensione.pubblica.azione")}
            </a>
          </>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label={t("recensione.sezione")}
      className="mt-5 rounded-xl border border-border bg-surface p-4"
    >
      <h2 className="text-base font-semibold">{t("recensione.titolo")}</h2>
      <p className="mt-0.5 text-sm text-muted">
        {t("recensione.sottotitolo")}
      </p>

      {/* Stelle grandi: si tocca con il pollice, seduti, spesso al buio. */}
      <div
        role="radiogroup"
        aria-label={t("recensione.voto.gruppo")}
        className="mt-3 flex items-center gap-1"
        onMouseLeave={() => setPassato(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={voto === n}
            aria-label={t.n(n, "recensione.stelle")}
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
              t("recensione.aggiungi")
            ) : (
              <>
                <span className="font-medium">{t("recensione.cosa_non_va")}</span>{" "}
                <span className="text-muted">
                  {t("recensione.cosa_non_va.aiuto")}
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
                  ? t("recensione.commento.alto")
                  : t("recensione.commento.basso")
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
            />
          </label>

          <label className="block text-sm">
            {t("recensione.nome")}
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={80}
              placeholder={t("recensione.nome.segnaposto")}
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
              ? t("recensione.invio")
              : voto === 5
                ? t("recensione.invia.alto")
                : t("recensione.invia.basso")}
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
