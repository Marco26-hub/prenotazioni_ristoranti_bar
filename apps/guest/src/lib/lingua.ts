import { headers, cookies } from "next/headers";
import { HEADER_LINGUA } from "@/proxy";
import {
  COOKIE_LINGUA,
  scegliLinguaUI,
  normalizzaLinguaUI,
  type LinguaUI,
} from "@repo/shared/i18n";

/**
 * In che lingua servire la pagina a chi ha inquadrato il QR.
 *
 * Nessun accesso al database e nessuna preferenza salvata sul cliente: al
 * tavolo non c'è un account. Restano tre segnali, e li si guarda in
 * quest'ordine — il link che ha appena cliccato, la scelta che aveva fatto
 * prima, la lingua del suo telefono.
 *
 * L'ultimo è quello che conta davvero: un turista tedesco che inquadra il QR
 * deve trovare l'inglese senza toccare niente. Se deve cercare il selettore,
 * il selettore ha già fallito.
 */
export async function linguaPagina(
  richiesta?: string | string[] | null,
  /**
   * La lingua che il locale ha scelto per le sue pagine
   * (`venues.lingua_predefinita`), quando la pagina sa di che locale è.
   *
   * Ultima in ordine di precedenza, e deve esserlo: è una preferenza fissa,
   * mentre la lingua del telefono dice qualcosa su *questa* persona. Conta
   * solo quando il telefono non dice niente di utile — un tedesco, per
   * esempio, che altrimenti finirebbe in italiano.
   */
  predefinitaLocale?: string | null
): Promise<LinguaUI> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  /*
   * Il layout non riceve i parametri della richiesta e non può passarli: per
   * lui il `?lang=` arriva dall'header che mette il proxy. Le pagine lo
   * passano direttamente e non hanno bisogno dell'header, ma leggerlo lo
   * stesso non cambia niente — è lo stesso valore.
   */
  const esplicita =
    (Array.isArray(richiesta) ? richiesta[0] : richiesta) ?? h.get(HEADER_LINGUA);
  return scegliLinguaUI(
    esplicita,
    c.get(COOKIE_LINGUA)?.value,
    h.get("accept-language"),
    normalizzaLinguaUI(predefinitaLocale) ?? undefined
  );
}
