import { LINGUE, LINGUA_BASE } from "@repo/shared/lingue";
import type { LinguaUI } from "@repo/shared/i18n";
import { tMenu } from "@/i18n/menu";

/**
 * Selettore della lingua.
 *
 * Link e non menu a tendina: sono al massimo undici voci, e un link
 * funziona anche prima che il JavaScript sia pronto — al tavolo, su rete
 * mobile lenta, è la differenza fra leggere il menu e fissare una pagina
 * bianca.
 *
 * Italiano e inglese ci sono sempre, anche quando il locale non ha tradotto
 * niente: `?lang=` comanda anche l'interfaccia, quindi l'inglese serve a
 * chi non capisce "Allergeni" e "Torna all'inizio" pur leggendo i nomi dei
 * piatti in italiano. Un secondo selettore per la sola interfaccia sarebbe
 * un controllo in più che fa quasi la stessa cosa.
 */
export function SelettoreLingua({
  base,
  attiva,
  disponibili,
  lingua,
}: {
  base: string;
  attiva: string;
  disponibili: string[];
  lingua: LinguaUI;
}) {
  const t = tMenu(lingua);

  const codici = [
    LINGUA_BASE,
    "en",
    ...disponibili.filter((c) => c !== LINGUA_BASE && c !== "en"),
  ];

  const voci = codici.map((c) => ({
    codice: c,
    nativo: c === LINGUA_BASE ? "Italiano" : LINGUE.find((l) => l.codice === c)?.nativo ?? c,
  }));

  // Un `?lang=` inventato non deve lasciare il selettore senza nessuna voce
  // accesa: in quel caso si serve l'italiano, e l'italiano si segna.
  const evidenziata = codici.includes(attiva) ? attiva : LINGUA_BASE;

  return (
    <nav aria-label={t("lingua.menu")} className="flex flex-wrap justify-center gap-1.5">
      {voci.map((v) => (
        <a
          key={v.codice}
          href={`${base}?lang=${v.codice}`}
          hrefLang={v.codice}
          aria-current={v.codice === evidenziata ? "true" : undefined}
          className={`flex min-h-11 items-center rounded-full px-3 text-sm ${
            v.codice === evidenziata
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
