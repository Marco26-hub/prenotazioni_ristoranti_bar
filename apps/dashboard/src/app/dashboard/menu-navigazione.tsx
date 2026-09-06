"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  COOKIE_LINGUA,
  LINGUE_UI,
  NOME_LINGUA_UI,
  type LinguaUI,
} from "@repo/shared/i18n";
import { useLingua } from "@repo/shared/i18n/contesto";
import { tComune } from "@repo/shared/i18n/comune";
import { tGuscio } from "@/i18n/guscio";
import { scegliLinguaMia } from "./lingua-actions";

/**
 * Il cambio di lingua, dove si vede senza cercarlo.
 *
 * Sta nella barra e non dentro le impostazioni di proposito: chi non legge
 * l'italiano non arriva a "Impostazioni" — è una parola italiana in fondo a
 * un elenco di parole italiane. Il selettore lo trova invece nel punto dove
 * sta già guardando, e da lì il resto del gestionale diventa leggibile.
 *
 * Scrive il cookie e ricarica: il testo lo compongono i componenti server,
 * quindi non basta uno stato del browser, la pagina va ricostruita di là.
 */
/*
 * Fuori dal componente perché scrivere `document.cookie` è una mutazione di
 * qualcosa che vive fuori da React, e dentro un componente il compilatore la
 * rifiuta — giustamente: da lì non si distingue da uno stato scritto male.
 * Qui è quello che è, un effetto sul browser, e si vede.
 */
function ricordaLingua(l: LinguaUI): void {
  // Un anno: la lingua non è una cosa che si cambia a ogni turno.
  document.cookie = `${COOKIE_LINGUA}=${l}; path=/; max-age=31536000; samesite=lax`;
}

function SelettoreLingua() {
  const lingua = useLingua();
  const c = tComune(lingua);

  const cambia = (l: LinguaUI) => {
    if (l === lingua) return;
    // Il cookie serve a chi non ha ancora un accesso — la pagina di login e
    // quella di registrazione. Per chi è dentro conta la colonna, perché è
    // quella che `linguaUtente()` guarda per prima: senza, il selettore
    // sarebbe muto per chiunque abbia toccato una volta le impostazioni.
    ricordaLingua(l);
    void scegliLinguaMia(l)
      .catch(() => {
        // Sessione scaduta o rete giù: resta il cookie, che comunque copre
        // il caso di chi non ha una preferenza salvata.
      })
      .finally(() => window.location.reload());
  };

  return (
    <div
      role="group"
      aria-label={c("lingua.scegli")}
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-border p-0.5"
    >
      {LINGUE_UI.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => cambia(l)}
          aria-pressed={l === lingua}
          className={`flex min-h-9 items-center rounded-full px-3 text-xs ${
            l === lingua
              ? "bg-background font-semibold text-foreground"
              : "text-muted"
          }`}
        >
          {NOME_LINGUA_UI[l]}
        </button>
      ))}
    </div>
  );
}

export interface VoceNav {
  href: string;
  label: string;
  /** "servizio" si tocca durante il servizio, "gestione" fuori. */
  fila: "servizio" | "gestione";
}

/**
 * Navigazione del gestionale.
 *
 * Su telefono scorreva in orizzontale, e le voci oltre la quinta restavano
 * fuori schermo: chi non sapeva di poter trascinare la barra non trovava
 * Impostazioni. Un elenco che si apre mostra tutto in una volta, e segna
 * dove ci si trova — cosa che una barra che scorre non faceva.
 *
 * Da schermo largo, due file. Sopra il servizio — quello che si tocca con
 * la sala piena, decine di volte a sera — sotto la gestione, che si apre il
 * lunedì mattina o una volta sola. In una striscia unica le due cose stavano
 * alla pari, e con dodici voci scorreva: metà gestionale finiva dietro un
 * gesto che nessuno sa di poter fare, e chi non lo sa non trova Impostazioni.
 *
 * Sotto, l'elenco a scomparsa: su un telefono due file di dodici voci
 * mangerebbero mezzo schermo prima di aver mostrato qualcosa.
 */
export function MenuNavigazione({ voci }: { voci: VoceNav[] }) {
  const t = tGuscio(useLingua());
  const percorso = usePathname();

  // Il menu è aperto solo per il percorso su cui è stato aperto: cambiando
  // pagina si richiude da sé, senza un effetto che insegua il percorso.
  // Restare aperto sopra la pagina appena scelta è il difetto classico di
  // questi menu.
  const [apertoSu, setApertoSu] = useState<string | null>(null);
  const aperto = apertoSu === percorso;
  const setAperto = (v: boolean | ((p: boolean) => boolean)) =>
    setApertoSu((prec) => {
      const vale = typeof v === "function" ? v(prec === percorso) : v;
      return vale ? percorso : null;
    });

  useEffect(() => {
    if (!aperto) return;
    const chiudi = (e: KeyboardEvent) => {
      if (e.key === "Escape") setApertoSu(null);
    };
    window.addEventListener("keydown", chiudi);
    return () => window.removeEventListener("keydown", chiudi);
  }, [aperto]);

  const attiva = (href: string) =>
    href === "/dashboard" ? percorso === href : percorso.startsWith(href);

  const corrente = voci.find((v) => attiva(v.href))?.label ?? t("nav.menu");

  return (
    <>
      {/* --- Telefono: un bottone che apre tutto ------------------------ */}
      <div className="px-4 pb-2 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAperto((v) => !v)}
            aria-expanded={aperto}
            aria-controls="nav-gestionale"
            className="flex min-h-11 flex-1 items-center justify-between rounded-lg border border-border px-3 text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden className="flex flex-col gap-[3px]">
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
              </span>
              {corrente}
            </span>
            <span aria-hidden className="text-xs text-muted">
              {aperto ? t("nav.chiudi") : t("nav.apri")}
            </span>
          </button>
          <SelettoreLingua />
        </div>

        {aperto && (
          <ul
            id="nav-gestionale"
            className="mt-2 overflow-hidden rounded-lg border border-border bg-surface"
          >
            {voci.map((v) => (
              <li key={v.href} className="border-b border-border last:border-0">
                <Link
                  href={v.href}
                  className={`flex min-h-12 items-center px-3 text-sm ${
                    attiva(v.href) ? "bg-accent/15 font-medium text-foreground" : "text-muted"
                  }`}
                >
                  {v.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* --- Schermo largo: due file --------------------------------- */}
      {/* Sopra il servizio, sotto la gestione. Le due file si distinguono
          per peso e non per colore: la prima porta le voci che si toccano
          con la sala piena, la seconda quelle che si aprono il lunedì. */}
      <nav
        aria-label={t("nav.etichetta")}
        className="mx-auto hidden max-w-7xl px-4 pb-2 lg:block"
      >
        <ul className="flex flex-wrap items-center gap-0.5">
          {voci
            .filter((v) => v.fila === "servizio")
            .map((v) => (
              <li key={v.href}>
                <Link
                  href={v.href}
                  aria-current={attiva(v.href) ? "page" : undefined}
                  className={`flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm hover:bg-background hover:text-foreground ${
                    attiva(v.href)
                      ? "bg-background font-semibold text-foreground shadow-sm"
                      : "font-medium text-foreground/80"
                  }`}
                >
                  {v.label}
                </Link>
              </li>
            ))}
        </ul>

        <ul className="mt-0.5 flex flex-wrap items-center gap-0.5 border-t border-border/60 pt-1">
          {voci
            .filter((v) => v.fila === "gestione")
            .map((v) => (
              <li key={v.href}>
                <Link
                  href={v.href}
                  aria-current={attiva(v.href) ? "page" : undefined}
                  className={`flex min-h-9 items-center whitespace-nowrap rounded-full px-3 text-xs hover:bg-background hover:text-foreground ${
                    attiva(v.href)
                      ? "bg-background font-semibold text-foreground"
                      : "text-muted"
                  }`}
                >
                  {v.label}
                </Link>
              </li>
            ))}
          <li className="ml-auto">
            <SelettoreLingua />
          </li>
        </ul>
      </nav>

    </>
  );
}
