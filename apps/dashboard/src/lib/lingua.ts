import "server-only";
import { cache } from "react";
import { headers, cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { COOKIE_LINGUA, scegliLinguaUI, type LinguaUI } from "@repo/shared/i18n";

/**
 * In che lingua mostrare il gestionale a chi ha fatto l'accesso.
 *
 * Diversa dalla pagina del cliente: qui c'è un account, e la scelta si
 * ricorda sull'utente invece che in un cookie. Un cameriere che lavora su
 * due telefoni deve trovare la sua lingua su tutti e due.
 *
 * La preferenza salvata batte tutto il resto, cookie compreso: chi l'ha
 * impostata nelle impostazioni l'ha scelta apposta. Chi non l'ha mai
 * impostata prende quella del browser, che al primo accesso è l'unica cosa
 * che sappiamo di lui.
 *
 * Memoizzata per richiesta con `cache()` di React, e non è un'ottimizzazione
 * facoltativa: una sola pagina la chiama cinque volte — il layout radice, i
 * suoi metadata, il layout del gestionale, la pagina, e il riquadro del
 * modulo non attivo — e ognuna faceva `auth()` più una query. Con `cache()`
 * la prima paga e le altre quattro leggono quella.
 *
 * Nel token JWT non ci va: una lingua cambiata resterebbe vecchia fino al
 * login dopo, e non vale la pena per una query su chiave primaria.
 */
export const linguaUtente = cache(async function linguaUtente(): Promise<LinguaUI> {
  const [sessione, h, c] = await Promise.all([auth(), headers(), cookies()]);

  let salvata: string | null = null;
  if (sessione?.user?.id) {
    const sql = db();
    const [riga] = await sql<{ lingua_ui: string | null }[]>`
      select lingua_ui from users where id = ${sessione.user.id}`;
    salvata = riga?.lingua_ui ?? null;
  }

  return scegliLinguaUI(salvata, c.get(COOKIE_LINGUA)?.value, h.get("accept-language"));
});
