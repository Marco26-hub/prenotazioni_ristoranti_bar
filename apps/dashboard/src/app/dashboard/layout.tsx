import Link from "next/link";
import { auth, signOut } from "@/auth";

const NAV = [
  { href: "/dashboard", label: "Tavoli" },
  { href: "/dashboard/orders", label: "Ordini" },
  { href: "/dashboard/menu", label: "Menu" },
  { href: "/dashboard/tables", label: "QR e tavoli" },
  { href: "/dashboard/reservations", label: "Prenotazioni" },
  { href: "/dashboard/staff", label: "Personale" },
  { href: "/dashboard/settings", label: "Impostazioni" },
  { href: "/dashboard/billing", label: "Abbonamento" },
];

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await auth();
  const venue = session?.venues[0];

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">
              {venue?.venueName ?? "Gestionale"}
            </p>
            <p className="truncate text-xs text-muted">{session?.user.email}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="flex min-h-11 shrink-0 items-center px-3 text-sm text-muted underline">
              Esci
            </button>
          </form>
        </div>

        {/* Su telefono la nav scorre in orizzontale invece di andare a capo:
            in sala si usa con una mano sola. */}
        <nav className="mx-auto max-w-4xl overflow-x-auto px-4 pb-2">
          <ul className="flex gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-sm text-muted hover:bg-background hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
