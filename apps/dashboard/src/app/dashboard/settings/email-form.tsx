"use client";

import { useActionState, useState } from "react";
import { salvaMittenteEmail, type EsitoEmailLocale } from "./email-actions";

const CAMPO = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

export function EmailForm({
  collegato,
  from,
  piattaformaAttiva,
}: {
  collegato: boolean;
  from: string | null;
  piattaformaAttiva: boolean;
}) {
  const [aperto, setAperto] = useState(false);
  const [state, formAction, pending] = useActionState<EsitoEmailLocale | null, FormData>(
    async (_prev, formData) => salvaMittenteEmail(formData),
    null
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {collegato ? (
          <>
            Le email ai tuoi clienti partono da <strong>{from}</strong>.
          </>
        ) : piattaformaAttiva ? (
          "Le email partono dal nostro mittente, con risposta al tuo indirizzo. Non devi fare nulla."
        ) : (
          "L'invio email non è ancora attivo: le prenotazioni arrivano solo nel gestionale e il cliente non riceve conferme."
        )}
      </p>

      {!aperto && (
        <button
          type="button"
          onClick={() => setAperto(true)}
          className="flex min-h-11 items-center px-1 text-sm underline"
        >
          {collegato ? "Cambia o rimuovi il tuo mittente" : "Usa il tuo dominio"}
        </button>
      )}

      {aperto && (
        <form action={formAction} className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm text-muted">
            Serve un account su <strong>resend.com</strong> e il tuo dominio
            verificato lì dentro, il che richiede di aggiungere due record DNS.
            È l&apos;unico passaggio tecnico del prodotto: se non te ne occupi
            tu, lascia perdere e resta il nostro mittente — funziona uguale.
          </p>

          <div>
            <label className="mb-1 block text-sm" htmlFor="resend-from">
              Mittente
            </label>
            <input
              id="resend-from"
              name="from"
              type="email"
              defaultValue={from ?? ""}
              placeholder="prenotazioni@iltuolocale.it"
              className={CAMPO}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm" htmlFor="resend-key">
              Chiave API Resend
            </label>
            <input
              id="resend-key"
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder="re_..."
              className={CAMPO}
            />
            <p className="mt-1 text-xs text-muted">
              Salvata cifrata. Salvando mandiamo una prova al mittente indicato:
              se non arriva, il dominio non è verificato.
            </p>
          </div>

          {collegato && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="rimuovi" className="h-5 w-5" />
              Rimuovi e torna al mittente della piattaforma
            </label>
          )}

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          {state?.success && <p className="text-sm text-success">{state.success}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {pending ? "Verifico…" : "Salva e prova"}
            </button>
            <button
              type="button"
              onClick={() => setAperto(false)}
              className="flex min-h-11 items-center px-3 text-sm underline"
            >
              Chiudi
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
