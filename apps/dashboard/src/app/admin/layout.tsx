import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSuperAdmin, NonAutorizzato } from "@/lib/authz";
import { messaggioErrore } from "@repo/shared/errori";
import { LINGUA_UI_BASE } from "@repo/shared/i18n";
import { tSuperAdmin } from "@/i18n/superadmin";
import { linguaUtente } from "@/lib/lingua";

/**
 * Area della piattaforma, separata dal gestionale di un locale.
 *
 * Chi vende il servizio non è il titolare di un ristorante: non ha un locale,
 * li ha tutti. Tenerla su un percorso proprio evita che una svista in una
 * pagina del gestionale esponga dati di locali diversi.
 */
export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  /*
   * La lingua si legge prima di tutto, ma un suo guasto non deve portarsi via
   * la pagina di guasto: se il database è irraggiungibile fallisce anche
   * questa lettura, e allora si ripiega sull'italiano invece di far sparire
   * il messaggio che spiega cosa sta succedendo.
   */
  const t = tSuperAdmin(await linguaUtente().catch(() => LINGUA_UI_BASE));

  /*
   * "Non sei autorizzato" e "qualcosa si è rotto" non sono la stessa cosa.
   *
   * Qualunque errore rimandava al login: col database irraggiungibile il
   * super amministratore rientrava, veniva rispedito al login, rientrava
   * ancora — in tondo, senza che niente dicesse che il problema non era la
   * password. Solo il rifiuto vero manda al login; il resto si dichiara.
   */
  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch (err) {
    // Sul tipo e non sul testo del messaggio: tradurre `authz.ts` avrebbe
    // fatto scambiare un rifiuto legittimo per un guasto, mandando il super
    // amministratore su "Pannello non raggiungibile" invece che al login.
    if (err instanceof NonAutorizzato) {
      redirect("/login");
    }

    /*
     * Gli errori con cui Next parla a se stesso vanno rilanciati.
     *
     * `redirect()`, `notFound()` e il segnale che marca una rotta come
     * dinamica sono implementati lanciando: un `catch` largo se li mangia e
     * al loro posto mostra la pagina di guasto. In compilazione si vedeva —
     * "[admin] accesso non verificabile: Dynamic server usage" su /admin e
     * /admin/password — ed è la stessa presa che, in esercizio, potrebbe
     * trasformare un reindirizzamento legittimo in un errore.
     *
     * Si riconoscono dal `digest`, che gli errori veri non hanno.
     */
    if (
      typeof (err as { digest?: unknown })?.digest === "string"
    ) {
      throw err;
    }
    console.error(`[admin] accesso non verificabile: ${messaggioErrore(err)}`);
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-lg font-semibold">{t("guscio.guasto.titolo")}</h1>
        <p className="mt-2 text-sm text-muted">{t("guscio.guasto.testo")}</p>
      </main>
    );
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-semibold leading-tight">{t("guscio.titolo")}</p>
            <p className="text-xs text-muted">{admin.email}</p>
          </div>
          <nav className="flex gap-1">
            <Link
              href="/admin"
              className="flex min-h-11 items-center rounded-full px-3 text-sm text-muted hover:text-foreground"
            >
              {t("guscio.nav.locali")}
            </Link>
            <Link
              href="/admin/password"
              className="flex min-h-11 items-center rounded-full px-3 text-sm text-muted hover:text-foreground"
            >
              {t("guscio.nav.password")}
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
