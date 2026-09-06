"use client";

import { useRef, useState } from "react";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tComune } from "@repo/shared/i18n/comune";
import { tMenu } from "@/i18n/menu";

interface Messaggio {
  chi: "cliente" | "locale";
  testo: string;
}

/**
 * Assistente del locale.
 *
 * Le domande suggerite non sono decorazione: senza, quasi nessuno scrive
 * per primo, e sono comunque le quattro cose che il locale si sente
 * chiedere al telefono tutto il giorno.
 */
const SUGGERITE = [
  "assistente.suggerita.orari",
  "assistente.suggerita.vegetariani",
  "assistente.suggerita.consigli",
  "assistente.suggerita.dove",
] as const;

export function Assistente({
  slug,
  nomeLocale,
}: {
  slug: string;
  nomeLocale: string;
}) {
  const lingua = useLingua();
  const t = tMenu(lingua);
  const tc = tComune(lingua);
  const [aperto, setAperto] = useState(false);
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fondoRef = useRef<HTMLDivElement>(null);

  async function chiedi(domanda: string) {
    const testo = domanda.trim();
    if (!testo || inCorso) return;

    setMessaggi((m) => [...m, { chi: "cliente", testo }]);
    setInCorso(true);
    if (inputRef.current) inputRef.current.value = "";

    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, domanda: testo }),
      });
      const dati = await res.json().catch(() => ({}));

      setMessaggi((m) => [
        ...m,
        res.ok
          ? { chi: "locale", testo: dati.risposta }
          : { chi: "locale", testo: dati.error ?? t("assistente.errore") },
      ]);
    } catch {
      setMessaggi((m) => [
        ...m,
        { chi: "locale", testo: t("assistente.errore.rete") },
      ]);
    } finally {
      setInCorso(false);
      requestAnimationFrame(() =>
        fondoRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
      );
    }
  }

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="fixed bottom-4 right-4 z-40 flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground shadow-lg"
      >
        <span aria-hidden>?</span>
        {t("assistente.apri")}
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 sm:inset-x-auto sm:right-4 sm:w-96">
      <div className="max-h-[80vh] overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:mb-4 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-medium leading-tight">
              {t("assistente.titolo", { nome: nomeLocale })}
            </p>
            <p className="text-xs text-muted">{t("assistente.sottotitolo")}</p>
          </div>
          <button
            type="button"
            onClick={() => setAperto(false)}
            aria-label={tc("azione.chiudi")}
            className="h-11 w-11 shrink-0 rounded-full border border-border text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="max-h-[45vh] space-y-3 overflow-y-auto px-4 py-3">
          {messaggi.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted">{t("assistente.invito")}</p>
              {SUGGERITE.map((chiave) => (
                <button
                  key={chiave}
                  type="button"
                  onClick={() => chiedi(t(chiave))}
                  className="flex min-h-11 w-full items-center rounded-xl border border-border px-3 text-left text-sm"
                >
                  {t(chiave)}
                </button>
              ))}
            </div>
          )}

          {messaggi.map((m, i) => (
            <div
              key={i}
              className={m.chi === "cliente" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.chi === "cliente"
                    ? "bg-accent text-accent-foreground"
                    : "border border-border"
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{m.testo}</p>
              </div>
            </div>
          ))}

          {inCorso && <p className="text-sm text-muted">{t("assistente.attesa")}</p>}
          <div ref={fondoRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            chiedi(inputRef.current?.value ?? "");
          }}
          className="flex gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <input
            ref={inputRef}
            maxLength={300}
            placeholder={t("assistente.placeholder")}
            aria-label={t("assistente.campo")}
            className="min-h-11 w-full min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-base"
          />
          <button
            type="submit"
            disabled={inCorso}
            className="min-h-11 shrink-0 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {t("assistente.invia")}
          </button>
        </form>
      </div>
    </div>
  );
}
