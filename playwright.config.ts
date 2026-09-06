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
