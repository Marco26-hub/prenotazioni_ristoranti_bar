"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { rinominaDispositivo, dimenticaDispositivo } from "./dispositivi-actions";

export interface Dispositivo {
  id: string;
  nome: string | null;
  reparto: string | null;
  ultimoUtente: string | null;
  ultimoAccesso: string;
}

const REPARTO: Record<string, string> = {
  cucina: "Cucina",
  bar: "Bar",
  pizzeria: "Pizzeria",
  pasticceria: "Pasticceria",
};

/** Da quanto non si fa vivo. Oltre i due minuti lo schermo è spento o via. */
function daQuando(iso: string, adesso: number): { testo: string; acceso: boolean } {
  // Prima che l'orologio parta non si afferma niente: meglio nessuno stato
  // che uno sbagliato per una frazione di secondo.
  if (adesso === 0) return { testo: "—", acceso: false };
  const min = Math.floor((adesso - new Date(iso).getTime()) / 60000);
  if (min < 2) return { testo: "in servizio adesso", acceso: true };
  if (min < 60) return { testo: `visto ${min} min fa`, acceso: false };
  const ore = Math.floor(min / 60);
  if (ore < 24) return { testo: `visto ${ore} h fa`, acceso: false };
  return { testo: `visto ${Math.floor(ore / 24)} giorni fa`, acceso: false };
}

export function DispositiviLista({ dispositivi }: { dispositivi: Dispositivo[] }) {
  const [avviso, setAvviso] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // L'orologio arriva dal browser, non dal render: Date.now() durante il
  // render darebbe un valore diverso sul server e qui, e "in servizio adesso"
  // lampeggerebbe all'idratazione. Prima che parta non si afferma niente.
  const adesso = useSyncExternalStore(
    (notifica) => {
      const t = setInterval(notifica, 30_000);
      return () => clearInterval(t);
    },
    () => Math.floor(Date.now() / 30_000) * 30_000,
    () => 0
  );

  if (dispositivi.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
        Nessuno schermo si è ancora presentato. Apri <strong>Ordini</strong> sul
        tablet della cucina o del bar: comparirà qui, e potrai dargli un nome.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {dispositivi.map((d) => {
          const stato = daQuando(d.ultimoAccesso, adesso);
          return (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {d.nome ?? "Schermo senza nome"}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      stato.acceso
                        ? "border-success text-success"
                        : "border-border text-muted"
                    }`}
                  >
                    {stato.testo}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  Mostra:{" "}
                  <strong className="text-foreground">
                    {d.reparto ? (REPARTO[d.reparto] ?? d.reparto) : "tutti i reparti"}
                  </strong>
                  {d.ultimoUtente && ` · ultimo accesso di ${d.ultimoUtente}`}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <form
                  action={(fd) =>
                    start(async () => {
                      const r = await rinominaDispositivo(d.id, String(fd.get("nome") ?? ""));
                      setAvviso(r.error ?? r.ok ?? null);
                    })
                  }
                  className="flex items-center gap-1"
                >
                  <input
                    name="nome"
                    defaultValue={d.nome ?? ""}
                    placeholder="Tablet cucina"
                    maxLength={40}
                    aria-label="Nome del dispositivo"
                    className="min-h-11 w-40 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="min-h-11 rounded-full border border-border px-3 text-sm disabled:opacity-50"
                  >
                    Salva
                  </button>
                </form>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await dimenticaDispositivo(d.id);
                      setAvviso(r.error ?? r.ok ?? null);
                    })
                  }
                  className="min-h-11 px-2 text-sm text-danger underline underline-offset-4 disabled:opacity-50"
                >
                  Dimentica
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {avviso && (
        <p role="status" className="mt-2 text-sm">
          {avviso}
        </p>
      )}

      <p className="mt-3 text-xs text-muted">
        Il reparto lo sceglie lo schermo stesso, da <strong>Ordini</strong>: è
        una proprietà del monitor, non della persona, così il tablet del bar
        resta sul bar anche quando ci passa qualcun altro. Qui lo vedi e dai
        un nome per riconoscerlo. <strong>Dimentica</strong> lo toglie
        dall&apos;elenco ma non lo disconnette: se è ancora in uso ricompare.
      </p>
    </>
  );
}
