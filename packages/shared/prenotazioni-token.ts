import { randomBytes } from "node:crypto";

/**
 * Segreto per disdire una prenotazione senza account né password.
 *
 * Chi ha il link è chi ha ricevuto l'email di conferma, e il link non dà
 * accesso a nient'altro: né ai dati del locale, né alle altre prenotazioni.
 *
 * Va indovinabile quanto una password: con 24 byte casuali provare a
 * indovinarne uno è fuori questione, e non serve altro — non protegge del
 * denaro, protegge un tavolo dal venire liberato da un estraneo.
 *
 * Base64url e non esadecimale: sta in un URL senza essere riscritto, ed è un
 * terzo più corto in un'email che qualcuno leggerà sul telefono.
 */
export function nuovoTokenDisdetta(): string {
  return randomBytes(24).toString("base64url");
}

/** L'indirizzo pubblico da mettere in fondo all'email. */
export function linkDisdetta(baseUrl: string, slug: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/p/${slug}/disdici/${token}`;
}
