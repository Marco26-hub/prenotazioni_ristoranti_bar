import { defineConfig } from "@playwright/test";

/**
 * I test girano in sequenza (workers: 1): condividono lo stesso database
 * reale e alcuni verificano conteggi/ordini, quindi l'esecuzione parallela
 * li renderebbe instabili.
 *
 * Per puntare alla produzione invece che al locale:
 *   E2E_GUEST_URL=https://ristoranti-guest.vercel.app \
 *   E2E_DASHBOARD_URL=https://ristoranti-dashboard.vercel.app pnpm test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  reporter: [["list"]],
  /*
   * Quindici secondi, non i cinque di partenza.
   *
   * Le asserzioni di questa suite non guardano dei calcoli: aspettano un
   * giro di rete più un ciclo di aggiornamento della pagina. Contro i server
   * locali cinque secondi bastano; contro la produzione, da un portatile,
   * no — e i test che cadevano erano sempre gli stessi due, quelli che
   * aspettano una comanda sulla board e la risposta di una Server Action.
   *
   * Falliva il collaudo, non il codice: rifatti da soli passavano. Un rosso
   * che dipende da dove lo si lancia insegna a rilanciare invece che a
   * guardare, ed è il modo più rapido di rendere inutile una suite.
   */
  expect: { timeout: 15_000 },
  use: {
    trace: "retain-on-failure",
    /*
     * La lingua va dichiarata, adesso che l'applicazione ne parla due.
     *
     * Playwright lancia il suo Chromium in inglese a prescindere da come è
     * impostato il computer: da quando esiste l'inglese, le prove scritte
     * contro l'italiano — "Accedi", "Il conto", "Compreso nella formula" —
     * cercavano parole che la pagina non scriveva più, e fallivano accusando
     * il codice di qualcosa che non aveva fatto.
     *
     * Le prove che riguardano proprio il cambio di lingua si aprono il loro
     * contesto con la lingua che vogliono (`browser.newContext({ locale })`),
     * quindi questa riga non le tocca.
     */
    locale: "it-IT",
  },
});
