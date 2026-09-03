"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface VoceNav {
  href: string;
  label: string;
}

/**
 * Navigazione del gestionale.
 *
 * Su telefono scorreva in orizzontale, e le voci oltre la quinta restavano
 * fuori schermo: chi non sapeva di poter trascinare la barra non trovava
 * Impostazioni. Un elenco che si apre mostra tutto in una volta, e segna
 * dove ci si trova — cosa che una barra che scorre non faceva.
 *
 * La barra torna da schermo largo, dove le voci ci stanno davvero. Sotto,
 * l'elenco a scomparsa: con dodici voci una barra che scorre nasconde metà
 * gestionale dietro un gesto che nessuno sa di poter fare — e chi non lo sa
 * non trova Impostazioni.
 *
 * Quando anche da larga la barra non basta, si vede che continua: le voci
 * ai bordi sfumano invece di essere tagliate di netto, e quella su cui ci
 * si trova viene portata in vista da sola. Una barra che scorre senza
 * dirlo è la ragione per cui questa nasconde le voci in fondo.
 */
export function MenuNavigazione({ voci }: { voci: VoceNav[] }) {
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

  /*
   * La voce corrente si porta in vista da sola.
   *
   * Con la barra più larga dello schermo, arrivare su una pagina in fondo
   * all'elenco la lasciava fuori campo: si vedeva una barra che non
   * evidenziava niente, e sembrava che nessuna voce fosse attiva.
   */
  const barra = useRef<HTMLElement>(null);
  useEffect(() => {
    const corrente = barra.current?.querySelector('[aria-current="page"]');
    corrente?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [percorso]);

  const corrente = voci.find((v) => attiva(v.href))?.label ?? "Menu";

  return (
    <>
      {/* --- Telefono: un bottone che apre tutto ------------------------ */}
      <div className="px-4 pb-2 lg:hidden">
        <button
          type="button"
          onClick={() => setAperto((v) => !v)}
          aria-expanded={aperto}
          aria-controls="nav-gestionale"
          className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border px-3 text-sm font-medium"
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
            {aperto ? "chiudi" : "menu"}
          </span>
        </button>

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

      {/* --- Schermo largo: la barra di sempre --------------------------- */}
      {/* Una riga sola: andando a capo la seconda riga resta mezza vuota e
          la testata sembra rotta. Le sfumature ai lati dicono che continua,
          e il contenuto sotto resta a max-w-4xl: è la barra che ha bisogno
          di più spazio, non il testo che si legge. */}
      <nav
        ref={barra}
        aria-label="Sezioni del gestionale"
        className="mx-auto hidden max-w-7xl overflow-x-auto px-4 pb-2 [mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)] lg:block"
      >
        <ul className="flex gap-0.5">
          {voci.map((v) => (
            <li key={v.href}>
              <Link
                href={v.href}
                aria-current={attiva(v.href) ? "page" : undefined}
                className={`flex min-h-11 items-center whitespace-nowrap rounded-full px-2.5 text-sm hover:bg-background hover:text-foreground ${
                  attiva(v.href) ? "bg-background font-medium text-foreground" : "text-muted"
                }`}
              >
                {v.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
