"use client";

import { useActionState, useState } from "react";
import { MODELLO_PREDEFINITO } from "@repo/shared/openrouter-tipi";
import { salvaChiaveOpenRouter, type EsitoChiave } from "../menu/etichetta-actions";

const CAMPO = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

export function OpenRouterForm({
  collegata,
  modello,
}: {
  collegata: boolean;
  modello: string | null;
}) {
  const [aperto, setAperto] = useState(false);
  const [state, formAction, pending] = useActionState<EsitoChiave | null, FormData>(
    async (_prev, formData) => salvaChiaveOpenRouter(formData),
    null
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {collegata ? (
          <>
            Attiva, modello <strong>{modello ?? MODELLO_PREDEFINITO}</strong>. Nel
            menu, sui vini, compare il bottone per compilare la scheda da una
            foto dell&apos;etichetta.
          </>
        ) : (
          "Non attiva. Le schede dei vini si compilano a mano."
        )}
      </p>

      {!aperto && (
        <button
          type="button"
          onClick={() => setAperto(true)}
          className="flex min-h-11 items-center px-1 text-sm underline"
        >
          {collegata ? "Cambia o rimuovi" : "Collega OpenRouter"}
        </button>
      )}

      {aperto && (
        <form action={formAction} className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm text-muted">
            Serve un account su <strong>openrouter.ai</strong>. Le chiamate
            vengono addebitate sul tuo account, non sul nostro: leggere
            un&apos;etichetta costa una frazione di centesimo.
          </p>

          <div>
            <label className="mb-1 block text-sm" htmlFor="or-key">
              Chiave API
            </label>
            <input
              id="or-key"
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder="sk-or-..."
              className={CAMPO}
            />
            <p className="mt-1 text-xs text-muted">Salvata cifrata.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm" htmlFor="or-model">
              Modello
            </label>
            <input
              id="or-model"
              name="model"
              defaultValue={modello ?? MODELLO_PREDEFINITO}
              className={CAMPO}
            />
            <p className="mt-1 text-xs text-muted">
              Deve saper leggere le immagini. Il catalogo di OpenRouter cambia
              spesso: se il modello non esiste più, l&apos;errore te lo dice
              testualmente e ne basta un altro.
            </p>
          </div>

          <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
            La foto dell&apos;etichetta viene inviata a OpenRouter e al
            fornitore del modello. Non contiene dati dei tuoi clienti, ma è
            un trattamento in più nella catena: se tieni un registro, va
            annotato.
          </p>

          {collegata && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="rimuovi" className="h-5 w-5" />
              Rimuovi la chiave
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
              {pending ? "Salvo…" : "Salva"}
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
