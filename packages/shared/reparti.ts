/**
 * Le postazioni di un locale: dove si prepara una cosa.
 *
 * Il reparto decide su quale schermo compare una comanda e chi la può
 * muovere. Sta qui e non in sei elenchi sparsi — c'era in
 * staff/actions.ts, dispositivi-actions.ts, rango-form.tsx, la board, la
 * pagina di stampa e i modelli di formato — perché sei copie della stessa
 * lista smettono di coincidere alla prima postazione aggiunta, e allora
 * qualcuno può scegliere un reparto che nessuno schermo mostra.
 */

export const REPARTI = [
  { chiave: "cucina", etichetta: "Cucina" },
  { chiave: "bar", etichetta: "Bar" },
  { chiave: "pizzeria", etichetta: "Pizzeria" },
  { chiave: "pasticceria", etichetta: "Pasticceria" },
  /*
   * Il banco del crudo, che non è la cucina.
   *
   * In un sushi il crudo lo fa una persona e i fritti e il wok un'altra, su
   * due postazioni diverse: mandando tutto in "cucina", i due si vedevano le
   * comande a vicenda e nessuno dei due sapeva quali fossero sue.
   */
  { chiave: "sushi", etichetta: "Banco sushi" },
  /*
   * La griglia, che in una steak house è un mestiere a parte: chi gira le
   * carni non prepara gli antipasti, e i tempi sono diversi.
   */
  { chiave: "griglia", etichetta: "Griglia" },
] as const;

export type Reparto = (typeof REPARTI)[number]["chiave"];

export const REPARTI_VALIDI: string[] = REPARTI.map((r) => r.chiave);

const PER_CHIAVE = new Map<string, string>(
  REPARTI.map((r) => [r.chiave as string, r.etichetta as string])
);

/** Il nome da mostrare. Uno sconosciuto si mostra com'è, non sparisce. */
export function etichettaReparto(chiave: string | null | undefined): string {
  return PER_CHIAVE.get(chiave ?? "") ?? chiave ?? "Cucina";
}
