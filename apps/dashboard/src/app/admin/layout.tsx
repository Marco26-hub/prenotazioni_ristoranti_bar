import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/authz";
import { messaggioErrore } from "@repo/shared/errori";

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
    if (err instanceof Error && err.message === "Non autorizzato") {
      redirect("/login");
    }
    console.error(`[admin] accesso non verificabile: ${messaggioErrore(err)}`);
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-lg font-semibold">Pannello non raggiungibile</h1>
        <p className="mt-2 text-sm text-muted">
          Non riesco a verificare l&apos;accesso: non è la password, è un
          guasto. Riprova fra poco — rientrare non serve.
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-semibold leading-tight">Piattaforma</p>
            <p className="text-xs text-muted">{admin.email}</p>
          </div>
          <nav className="flex gap-1">
            <Link
              href="/admin"
              className="flex min-h-11 items-center rounded-full px-3 text-sm text-muted hover:text-foreground"
            >
              Locali
            </Link>
            <Link
              href="/admin/password"
              className="flex min-h-11 items-center rounded-full px-3 text-sm text-muted hover:text-foreground"
            >
              Password
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
