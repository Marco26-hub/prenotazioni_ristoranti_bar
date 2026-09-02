"use client";

import { useActionState } from "react";
import { salvaAssistente, type EsitoAssistente } from "./assistente-actions";

const AREA = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

export function AssistenteForm({
  orari,
  info,
  attivo,
  chiaveCollegata,
}: {
  orari: string | null;
  info: string | null;
  attivo: boolean;
  chiaveCollegata: boolean;
}) {
  const [state, formAction, pending] = useActionState<EsitoAssistente | null, FormData>(
    async (_prev, formData) => salvaAssistente(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm" htmlFor="orari">
          Orari
        </label>
        <textarea
          id="orari"
          name="orari"
          rows={3}
          defaultValue={orari ?? ""}
          placeholder={"Martedì-domenica 12:00-14:30 e 19:00-23:00\nLunedì chiuso\nCucina fino alle 22:30"}
          className={AREA}
        />
        <p className="mt-1 text-xs text-muted">
          Scrivili come li diresti al telefono, eccezioni comprese. Compaiono
          sulla pagina pubblica anche senza assistente.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm" htmlFor="info">
          Informazioni pratiche
        </label>
        <textarea
          id="info"
          name="info"
          rows={3}
          defaultValue={info ?? ""}
          placeholder="Parcheggio in piazza a 50 metri. Dehors coperto. Cani ammessi. Accessibile in carrozzina."
          className={AREA}
        />
        <p className="mt-1 text-xs text-muted">
          Parcheggio, dehors, animali, accessibilità: le domande che oggi
          arrivano al telefono.
        </p>
      </div>

      <label className="flex min-h-11 items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="assistente"
          defaultChecked={attivo}
          disabled={!chiaveCollegata}
          className="mt-0.5 h-5 w-5"
        />
        <span>
          Accendi l&apos;assistente sulle pagine pubbliche
          <span className="block text-xs text-muted">
            {chiaveCollegata
              ? "Ogni domanda di un cliente è una chiamata addebitata sul tuo account OpenRouter. Spento non costa nulla."
              : "Serve prima una chiave OpenRouter, qui sopra."}
          </span>
        </span>
      </label>

      <p className="rounded-lg border border-border p-3 text-xs text-muted">
        Risponde solo con quello che hai scritto tu: menu, orari, indirizzo,
        informazioni pratiche. Su allergie e intolleranze riporta ciò che è
        dichiarato e rimanda sempre al personale — non dichiara mai un piatto
        sicuro, perché una risposta sbagliata lì manda qualcuno in ospedale.
      </p>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground disabled:opacity-50"
      >
        {pending ? "Salvataggio…" : "Salva"}
      </button>
    </form>
  );
}
