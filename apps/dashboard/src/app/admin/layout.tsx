import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/authz";

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
  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch {
    redirect("/login");
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
