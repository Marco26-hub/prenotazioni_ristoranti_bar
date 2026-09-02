import Link from "next/link";
import { auth, signOut } from "@/auth";
import { db } from "@repo/shared/db";
import { DPA_VERSION } from "@/lib/dpa";
import { AvvisoConformita } from "./avviso-conformita";
import { Notifiche } from "./notifiche";
import { hasModulo, type Modulo } from "@repo/shared";

const NAV = [
  { href: "/dashboard", label: "Tavoli", modulo: "ordini" },
  { href: "/dashboard/orders", label: "Ordini", modulo: "ordini" },
  { href: "/dashboard/analisi", label: "Analisi", modulo: "ordini" },
  { href: "/dashboard/menu", label: "Menu", modulo: "ordini" },
  { href: "/dashboard/tables", label: "QR e tavoli", modulo: "ordini" },
  { href: "/dashboard/reservations", label: "Prenotazioni", modulo: "prenotazioni" },
  { href: "/dashboard/invoices", label: "Fatture", modulo: "ordini" },
  { href: "/dashboard/staff", label: "Personale" },
  { href: "/dashboard/settings", label: "Impostazioni" },
  { href: "/dashboard/billing", label: "Abbonamento" },
] satisfies Array<{ href: string; label: string; modulo?: Modulo }>;

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await auth();
  const venue = session?.venues[0];

  // Stato di conformità: serve a ogni pagina del gestionale, quindi si legge
  // qui una volta sola invece che in ognuna.
  let serveDpa = false;
  let datiMancanti: string[] = [];
  let moduliAttivi = new Set<Modulo>();

  if (venue) {
    const sql = db();
    const [row] = await sql<
      {
        dpa_version: string | null;
        vat_number: string | null;
        fiscal_code: string | null;
        address_city: string | null;
        public_email: string | null;
        pec: string | null;
        subscription_status: string;
        subscription_period_end: Date | null;
        modules: string[] | null;
      }[]
    >`select dpa_version, vat_number, fiscal_code, address_city, public_email, pec,
             subscription_status, subscription_period_end, modules
        from venues where id = ${venue.venueId}`;

    // Solo il titolare può accettare: mostrarlo a chi è in sala sarebbe un
    // avviso su cui non può fare nulla.
    serveDpa = venue.role === "owner" && row?.dpa_version !== DPA_VERSION;

    datiMancanti = [
      !row?.vat_number && !row?.fiscal_code ? "la partita IVA" : null,
      !row?.address_city ? "l'indirizzo" : null,
      !row?.public_email && !row?.pec ? "un contatto per i clienti" : null,
    ].filter((v): v is string => v !== null);

    moduliAttivi = new Set(
      (["ordini", "prenotazioni"] as Modulo[]).filter((modulo) =>
        hasModulo(modulo, row?.subscription_status, row?.subscription_period_end, row?.modules)
      )
    );
  }

  return (
    <div className="dashboard-shell flex min-h-full flex-col">
      <a href="#main-content" className="dashboard-skip-link">Vai al contenuto</a>
      <header className="sticky top-0 z-10 border-b border-border backdrop-blur">
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
              await signOut({ redirectTo: "/" });
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
            {NAV.filter((item) => !item.modulo || moduliAttivi.has(item.modulo)).map((item) => (
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

      <Notifiche />

      <AvvisoConformita serveDpa={serveDpa} datiMancanti={datiMancanti} />

      <div id="main-content" className="flex-1">{children}</div>
    </div>
  );
}
