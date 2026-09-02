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
  },
});
