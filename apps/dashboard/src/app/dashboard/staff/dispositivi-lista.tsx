"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { rinominaDispositivo, dimenticaDispositivo } from "./dispositivi-actions";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tPersone } from "@/i18n/persone";

type T = ReturnType<typeof tPersone>;

export interface Dispositivo {
  id: string;
  nome: string | null;
  reparto: string | null;
  ultimoUtente: string | null;
  ultimoAccesso: string;
}

/** Le chiavi dei reparti restano a database: qui si traduce l'etichetta. */
const REPARTO: Record<string, Parameters<T>[0]> = {
  cucina: "reparto.cucina",
  bar: "reparto.bar",
  pizzeria: "reparto.pizzeria",
  pasticceria: "reparto.pasticceria",
};

/** Da quanto non si fa vivo. Oltre i due minuti lo schermo è spento o via. */
function daQuando(
  iso: string,
  adesso: number,
  t: T
): { testo: string; acceso: boolean } {
  // Prima che l'orologio parta non si afferma niente: meglio nessuno stato
  // che uno sbagliato per una frazione di secondo.
  if (adesso === 0) return { testo: t("visto.mai"), acceso: false };
  const min = Math.floor((adesso - new Date(iso).getTime()) / 60000);
  if (min < 2) return { testo: t("visto.adesso"), acceso: true };
  if (min < 60) return { testo: t("visto.minuti", { n: min }), acceso: false };
  const ore = Math.floor(min / 60);
  if (ore < 24) return { testo: t("visto.ore", { n: ore }), acceso: false };
  return { testo: t.n(Math.floor(ore / 24), "visto.giorni"), acceso: false };
}

export function DispositiviLista({ dispositivi }: { dispositivi: Dispositivo[] }) {
  const t = tPersone(useLingua());
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
    // La frase nomina una voce di menu, e quella va in grassetto perché è
    // qualcosa da andare a cercare sullo schermo. Il dizionario tiene la
    // frase intera con `{ordini}` dentro invece di spezzarla in due chiavi:
    // in inglese la parola non cade nello stesso punto, e due mezze frasi da
    // ricucire sono il modo più sicuro di ritrovarsi con una traduzione che
    // non sta in piedi.
    const [prima, dopo] = t("dispositivi.vuoto").split("{ordini}");
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
        {prima}
        <strong>{t("dispositivi.ordini")}</strong>
        {dopo}
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {dispositivi.map((d) => {
          const stato = daQuando(d.ultimoAccesso, adesso, t);
          return (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {d.nome ?? t("dispositivi.senza_nome")}
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
                  {t("dispositivi.mostra")}{" "}
                  <strong className="text-foreground">
                    {d.reparto
                      ? REPARTO[d.reparto]
                        ? t(REPARTO[d.reparto])
                        : d.reparto
                      : t("dispositivi.tutti_i_reparti")}
                  </strong>
                  {d.ultimoUtente &&
                    t("dispositivi.ultimo_accesso", { utente: d.ultimoUtente })}
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
                    placeholder={t("dispositivi.nome.placeholder")}
                    maxLength={40}
                    aria-label={t("dispositivi.nome.etichetta")}
                    className="min-h-11 w-40 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="min-h-11 rounded-full border border-border px-3 text-sm disabled:opacity-50"
                  >
                    {t("dispositivi.salva")}
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
                  {t("dispositivi.dimentica")}
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
        {t("dispositivi.nota.a")} <strong>{t("dispositivi.ordini")}</strong>
        {t("dispositivi.nota.b")} <strong>{t("dispositivi.dimentica")}</strong>{" "}
        {t("dispositivi.nota.c")}
      </p>
    </>
  );
}
