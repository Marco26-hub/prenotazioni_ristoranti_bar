"use client";

import { useActionState } from "react";
import {
  salvaImpostazioniPrenotazioni,
  type EsitoPrenotazioni,
} from "./prenotazioni-actions";

const CAMPO = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm";

export function PrenotazioniForm({
  email,
  capienza,
  autoConfirm,
}: {
  email: string | null;
  capienza: number | null;
  autoConfirm: boolean;
}) {
  const [state, formAction, pending] = useActionState<EsitoPrenotazioni | null, FormData>(
    async (_prev, formData) => salvaImpostazioniPrenotazioni(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm" htmlFor="reservationEmail">
          Dove ricevere le richieste
        </label>
        <input
          id="reservationEmail"
          name="reservationEmail"
          type="email"
          defaultValue={email ?? ""}
          placeholder="prenotazioni@iltuolocale.it"
          className={CAMPO}
        />
        <p className="mt-1 text-xs text-muted">
          Spesso non è l&apos;indirizzo pubblico: le prenotazioni le guarda una
          persona sola. Lasciando vuoto usiamo l&apos;email pubblica del locale.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm" htmlFor="capacity">
          Quanti coperti puoi servire nella stessa fascia
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min="1"
          max="2000"
          defaultValue={capienza ?? ""}
          placeholder="es. 40"
          className={CAMPO}
        />
        <p className="mt-1 text-xs text-muted">
          Serve a dire di no da soli quando è pieno, e a proporre al cliente
          gli orari vicini in cui c&apos;è posto. Senza, ogni richiesta arriva
          a te senza controllo.
        </p>
      </div>

      <label className="flex min-h-11 items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="autoConfirm"
          defaultChecked={autoConfirm}
          className="mt-0.5 h-5 w-5"
        />
        <span>
          Conferma da sola le richieste che ci stanno nella capienza
          <span className="block text-xs text-muted">
            Il cliente riceve subito la conferma. Tu puoi comunque annullare.
          </span>
        </span>
      </label>

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
