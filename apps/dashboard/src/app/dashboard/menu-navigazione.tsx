"use client";

import { useEffect, useState } from "react";
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
 * Da tablet in su resta la barra: c'è spazio per tutte le voci e un tocco in
 * meno vale più di un menu.
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

  const corrente = voci.find((v) => attiva(v.href))?.label ?? "Menu";

  return (
    <>
      {/* --- Telefono: un bottone che apre tutto ------------------------ */}
      <div className="px-4 pb-2 sm:hidden">
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

      {/* --- Tablet e desktop: la barra di sempre ----------------------- */}
      {/* Una riga sola: andando a capo la seconda riga resta mezza vuota e
          la testata sembra rotta. Se le voci non ci stanno la barra scorre,
          ma su telefono c'è il menu qui sopra e non serve trascinarla. */}
      <nav className="mx-auto hidden max-w-4xl overflow-x-auto px-4 pb-2 sm:block">
        <ul className="flex gap-1">
          {voci.map((v) => (
            <li key={v.href}>
              <Link
                href={v.href}
                aria-current={attiva(v.href) ? "page" : undefined}
                className={`flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-sm hover:bg-background hover:text-foreground ${
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
