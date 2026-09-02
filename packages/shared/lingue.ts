/**
 * Menu in più lingue.
 *
 * L'italiano è sempre la base e non è mai una traduzione: è ciò che il
 * ristoratore ha scritto. Le altre lingue sono sovrascritture parziali, e
 * un campo non tradotto ricade sull'italiano invece di sparire — un piatto
 * senza nome è peggio di un piatto con il nome in italiano.
 */

export interface Lingua {
  codice: string;
  nome: string;
  /** Come la chiama chi la parla: in un selettore è quello che si cerca. */
  nativo: string;
}

export const LINGUE: Lingua[] = [
  { codice: "en", nome: "Inglese", nativo: "English" },
  { codice: "de", nome: "Tedesco", nativo: "Deutsch" },
  { codice: "fr", nome: "Francese", nativo: "Français" },
  { codice: "es", nome: "Spagnolo", nativo: "Español" },
  { codice: "pt", nome: "Portoghese", nativo: "Português" },
  { codice: "nl", nome: "Olandese", nativo: "Nederlands" },
  { codice: "ru", nome: "Russo", nativo: "Русский" },
  { codice: "zh", nome: "Cinese", nativo: "中文" },
  { codice: "ja", nome: "Giapponese", nativo: "日本語" },
  { codice: "ar", nome: "Arabo", nativo: "العربية" },
];

export const LINGUA_BASE = "it";

export function linguaPerCodice(codice: string): Lingua | undefined {
  return LINGUE.find((l) => l.codice === codice);
}

/** I campi che si traducono. Il prezzo non è uno di questi. */
export interface CampiTradotti {
  name?: string;
  description?: string;
  ingredients?: string;
}

export type Traduzioni = Record<string, CampiTradotti>;

/**
 * Applica la traduzione a un oggetto, campo per campo.
 *
 * Parziale di proposito: un ristoratore traduce i nomi e lascia indietro
 * gli ingredienti, e va bene così. Ogni campo mancante torna all'italiano.
 */
export function traduci<
  T extends { name: string; description?: string | null; ingredients?: string | null },
>(base: T, traduzioni: Traduzioni | null | undefined, lingua: string): T {
  if (lingua === LINGUA_BASE) return base;

  const t = traduzioni?.[lingua];
  if (!t) return base;

  return {
    ...base,
    name: t.name?.trim() || base.name,
    ...(base.description !== undefined
      ? { description: t.description?.trim() || base.description }
      : {}),
    ...(base.ingredients !== undefined
      ? { ingredients: t.ingredients?.trim() || base.ingredients }
      : {}),
  };
}

/**
 * Lingua da usare, scegliendo fra quelle che il locale offre davvero.
 *
 * L'ordine conta: una scelta esplicita del cliente batte il browser, e il
 * browser batte l'italiano. Proporre una lingua che il locale non ha
 * tradotto darebbe un menu mezzo vuoto.
 */
export function scegliLingua(
  richiesta: string | null | undefined,
  headerAcceptLanguage: string | null | undefined,
  disponibili: string[]
): string {
  if (richiesta && (richiesta === LINGUA_BASE || disponibili.includes(richiesta))) {
    return richiesta;
  }

  if (headerAcceptLanguage) {
    // "en-GB,en;q=0.9,it;q=0.8" → en, it. I pesi sono già in ordine.
    const preferite = headerAcceptLanguage
      .split(",")
      .map((p) => p.split(";")[0].trim().slice(0, 2).toLowerCase())
      .filter(Boolean);

    for (const p of preferite) {
      if (p === LINGUA_BASE) return LINGUA_BASE;
      if (disponibili.includes(p)) return p;
    }
  }

  return LINGUA_BASE;
}

/** Quanti campi mancano, per dire al ristoratore cosa gli resta da fare. */
export function traduzioniMancanti(
  items: Array<{ name: string; description: string | null; translations: Traduzioni | null }>,
  lingua: string
): number {
  let mancanti = 0;
  for (const i of items) {
    const t = i.translations?.[lingua];
    if (!t?.name?.trim()) mancanti += 1;
    if (i.description && !t?.description?.trim()) mancanti += 1;
  }
  return mancanti;
}
