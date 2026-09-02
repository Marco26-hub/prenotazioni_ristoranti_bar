import Link from "next/link";
import { auth, signOut } from "@/auth";
import { db } from "@repo/shared/db";
import { DPA_VERSION } from "@/lib/dpa";
import { AvvisoConformita } from "./avviso-conformita";

const NAV = [
  { href: "/dashboard", label: "Tavoli" },
  { href: "/dashboard/orders", label: "Ordini" },
  { href: "/dashboard/analisi", label: "Analisi" },
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

  // Stato di conformità: serve a ogni pagina del gestionale, quindi si legge
  // qui una volta sola invece che in ognuna.
  let serveDpa = false;
  let datiMancanti: string[] = [];

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
      }[]
    >`select dpa_version, vat_number, fiscal_code, address_city, public_email, pec
        from venues where id = ${venue.venueId}`;

    // Solo il titolare può accettare: mostrarlo a chi è in sala sarebbe un
    // avviso su cui non può fare nulla.
    serveDpa = venue.role === "owner" && row?.dpa_version !== DPA_VERSION;

    datiMancanti = [
      !row?.vat_number && !row?.fiscal_code ? "la partita IVA" : null,
      !row?.address_city ? "l'indirizzo" : null,
      !row?.public_email && !row?.pec ? "un contatto per i clienti" : null,
    ].filter((v): v is string => v !== null);
  }

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

      <AvvisoConformita serveDpa={serveDpa} datiMancanti={datiMancanti} />

      <div className="flex-1">{children}</div>
    </div>
  );
}
