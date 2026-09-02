import { LINGUE, LINGUA_BASE } from "@repo/shared/lingue";

/**
 * Selettore della lingua.
 *
 * Link e non menu a tendina: sono al massimo undici voci, e un link
 * funziona anche prima che il JavaScript sia pronto — al tavolo, su rete
 * mobile lenta, è la differenza fra leggere il menu e fissare una pagina
 * bianca.
 */
export function SelettoreLingua({
  base,
  attiva,
  disponibili,
}: {
  base: string;
  attiva: string;
  disponibili: string[];
}) {
  if (disponibili.length === 0) return null;

  const voci = [
    { codice: LINGUA_BASE, nativo: "Italiano" },
    ...disponibili.map((c) => ({
      codice: c,
      nativo: LINGUE.find((l) => l.codice === c)?.nativo ?? c,
    })),
  ];

  return (
    <nav aria-label="Lingua del menu" className="flex flex-wrap justify-center gap-1.5">
      {voci.map((v) => (
        <a
          key={v.codice}
          href={`${base}?lang=${v.codice}`}
          hrefLang={v.codice}
          aria-current={v.codice === attiva ? "true" : undefined}
          className={`flex min-h-11 items-center rounded-full px-3 text-sm ${
            v.codice === attiva
              ? "bg-accent text-accent-foreground"
              : "border border-border text-muted"
          }`}
        >
          {v.nativo}
        </a>
      ))}
    </nav>
  );
}
