"use client";

import { useEffect, useRef, useState } from "react";
import { ALLERGENI, normalizzaAllergeni, allergeniFuoriElenco } from "@repo/shared/allergeni";

/**
 * Allergeni come caselle, non come campo libero.
 *
 * Il campo di testo che c'era prima accettava qualunque cosa: "latticini",
 * "frutta secca", "no glutine". A un controllo nessuna di queste è la
 * dichiarazione prevista dall'Allegato II, e chi ha un'allergia cerca la
 * parola esatta e non la trova.
 *
 * Il valore continua a viaggiare come stringa separata da virgole nello
 * stesso campo `allergens`, così la Server Action non cambia e i menu già
 * salvati restano validi.
 */
export function AllergeniFlag({ valori }: { valori: string[] | null }) {
  const [scelti, setScelti] = useState<string[]>(() => normalizzaAllergeni(valori));
  // Quello che era stato scritto a mano e non rientra nei quattordici: lo
  // teniamo da parte invece di buttarlo, ma segnalato.
  const [liberi] = useState<string[]>(() => allergeniFuoriElenco(valori));

  const ancora = useRef<HTMLFieldSetElement>(null);

  // La scheda vino letta dall'etichetta propone i suoi allergeni: qui
  // diventano spunte, non testo, così restano quelli dell'Allegato II.
  useEffect(() => {
    const el = ancora.current;
    if (!el) return;
    const onSuggeriti = (e: Event) => {
      const proposti = (e as CustomEvent<string[]>).detail;
      if (!Array.isArray(proposti)) return;
      setScelti((p) => [...new Set([...p, ...normalizzaAllergeni(proposti)])]);
    };
    const form = el.closest("form");
    form?.addEventListener("allergeni-suggeriti", onSuggeriti);
    return () => form?.removeEventListener("allergeni-suggeriti", onSuggeriti);
  }, []);

  const attiva = (chiave: string) =>
    setScelti((p) => (p.includes(chiave) ? p.filter((x) => x !== chiave) : [...p, chiave]));

  return (
    <fieldset ref={ancora} className="rounded-lg border border-border p-3">
      <legend className="px-1 text-xs font-medium text-muted">
        Allergeni — obbligatori per legge (Reg. UE 1169/2011)
      </legend>

      <input type="hidden" name="allergens" value={[...scelti, ...liberi].join(", ")} />

      <div className="grid gap-1.5 sm:grid-cols-2">
        {ALLERGENI.map((a) => {
          const on = scelti.includes(a.chiave);
          return (
            <label
              key={a.chiave}
              className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                on ? "border-accent bg-accent/10" : "border-border"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => attiva(a.chiave)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span className="min-w-0">
                <span className="block font-medium leading-tight">{a.etichetta}</span>
                <span className="block text-xs leading-tight text-muted">{a.esempi}</span>
              </span>
            </label>
          );
        })}
      </div>

      {liberi.length > 0 && (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          Voci non previste dall&apos;Allegato II già salvate su questo piatto:{" "}
          <strong>{liberi.join(", ")}</strong>. Restano sul menu, ma non valgono
          come dichiarazione: spunta sopra l&apos;allergene corrispondente.
        </p>
      )}

      {scelti.length === 0 && liberi.length === 0 && (
        <p className="mt-2 text-xs text-muted">
          Nessuno spuntato. Se il piatto ne contiene davvero nessuno, va bene;
          se non li hai ancora verificati, il menu non è a norma.
        </p>
      )}
    </fieldset>
  );
}
