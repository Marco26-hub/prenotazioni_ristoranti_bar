"use client";

import { useActionState } from "react";
import { TESTI_PUBBLICI, type TestiPubblici } from "@repo/shared/testi";
import { salvaTestiPubblici } from "./testi-actions";

const CAMPO =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

export function TestiForm({
  testi,
  nomeLocale,
}: {
  testi: TestiPubblici;
  nomeLocale: string;
}) {
  const [state, formAction, pending] = useActionState<
    { ok?: string; error?: string } | null,
    FormData
  >(async (_prev, formData) => salvaTestiPubblici(formData), null);

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted">
        Le frasi che il cliente legge intorno al menu e alle prenotazioni.
        Lascia vuoto per tenere il testo che vedi in grigio. Scrivi{" "}
        <code className="rounded bg-background px-1">{"{nome}"}</code> dove
        vuoi che compaia <strong>{nomeLocale}</strong>.
      </p>

      {TESTI_PUBBLICI.map((slot) => {
        const valore = testi[slot.chiave] ?? "";
        return (
          <div key={slot.chiave}>
            <label className="mb-1 block text-sm font-medium" htmlFor={slot.chiave}>
              {slot.etichetta}
            </label>
            <p className="mb-1.5 text-xs text-muted">{slot.dove}</p>
            {slot.lungo ? (
              <textarea
                id={slot.chiave}
                name={slot.chiave}
                defaultValue={valore}
                placeholder={slot.predefinito || "Vuoto: non compare niente"}
                rows={3}
                maxLength={600}
                className={CAMPO}
              />
            ) : (
              <input
                id={slot.chiave}
                name={slot.chiave}
                defaultValue={valore}
                placeholder={slot.predefinito}
                maxLength={600}
                className={`${CAMPO} min-h-11`}
              />
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Salvo…" : "Salva testi"}
        </button>
        {state?.ok && (
          <p role="status" className="text-sm text-success">
            {state.ok}
          </p>
        )}
        {state?.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
