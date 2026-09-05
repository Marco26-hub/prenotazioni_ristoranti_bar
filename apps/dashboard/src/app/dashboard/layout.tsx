import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@repo/shared/db";
import { DPA_VERSION } from "@/lib/dpa";
import { AvvisoConformita } from "./avviso-conformita";
import { Notifiche } from "./notifiche";
import { MenuNavigazione } from "./menu-navigazione";
import { hasModulo, type Modulo } from "@repo/shared";

/*
 * Due file, e non è una questione di spazio.
 *
 * Sopra sta il servizio: quello che si tocca mentre la sala è piena, decine
 * di volte a sera. Sotto la gestione: quello che si apre il lunedì mattina,
 * o una volta sola. Tenerle in un'unica striscia le metteva alla pari, e
 * Impostazioni finiva accanto a Ordini con lo stesso peso — mentre una si
 * apre una volta e l'altra ogni due minuti.
 *
 * Divise così le voci ci stanno anche su un portatile, senza trascinare
 * niente e senza nascondere metà gestionale dietro un gesto.
 */
const NAV = [
  { href: "/dashboard", label: "Tavoli", modulo: "ordini", fila: "servizio" },
  { href: "/dashboard/avvio", label: "Primi passi", fila: "gestione" },
  { href: "/dashboard/orders", label: "Ordini", modulo: "ordini", fila: "servizio" },
  { href: "/dashboard/banco", label: "Banco", modulo: "ordini", fila: "servizio" },
  {
    href: "/dashboard/reservations",
    label: "Prenotazioni",
    modulo: "prenotazioni",
    fila: "servizio",
  },
  { href: "/dashboard/menu", label: "Menu", modulo: "ordini", fila: "servizio" },
  { href: "/dashboard/tables", label: "QR e tavoli", modulo: "ordini", fila: "servizio" },

  { href: "/dashboard/analisi", label: "Analisi", modulo: "ordini", fila: "gestione" },
  { href: "/dashboard/invoices", label: "Fatture", modulo: "ordini", fila: "gestione" },
  { href: "/dashboard/fiscale", label: "Corrispettivi", modulo: "ordini", fila: "gestione" },
  { href: "/dashboard/recensioni", label: "Recensioni", fila: "gestione" },
  { href: "/dashboard/staff", label: "Personale", fila: "gestione" },
  { href: "/dashboard/settings", label: "Impostazioni", fila: "gestione" },
  { href: "/dashboard/billing", label: "Abbonamento", fila: "gestione" },
  { href: "/dashboard/assistenza", label: "Assistenza", fila: "gestione" },
] satisfies Array<{
  href: string;
  label: string;
  modulo?: Modulo;
  fila: "servizio" | "gestione";
}>;

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await auth();

  /*
   * Il super amministratore non ha locali: senza questo vedrebbe "Nessun
   * locale associato" e non avrebbe modo di arrivare al suo pannello.
   */
  if (session?.user.id) {
    const sqlAdmin = db();
    const [chi] = await sqlAdmin<
      { is_super_admin: boolean; must_change_password: boolean }[]
    >`select is_super_admin, must_change_password
        from users where id = ${session.user.id}`;

    if (chi?.is_super_admin) redirect("/admin");

    // Vale per chiunque, non solo per il super amministratore: la password
    // che il titolare ha ricevuto al telefono è stata detta a voce, quindi
    // vale per un accesso solo.
    if (chi?.must_change_password) redirect("/cambia-password");
  }
  const venue = session?.venues[0];

  // Stato di conformità: serve a ogni pagina del gestionale, quindi si legge
  // qui una volta sola invece che in ognuna.
  let serveDpa = false;
  let datiMancanti: string[] = [];
  let moduliAttivi = new Set<Modulo>();
  // Il banco compare solo a chi consegna al bancone: per una trattoria
  // sarebbe una voce in più che non apre niente.
  let banco = false;

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
        pickup_numbering_enabled: boolean;
      }[]
    >`select dpa_version, vat_number, fiscal_code, address_city, public_email, pec,
           pickup_numbering_enabled,
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

    banco = Boolean(row?.pickup_numbering_enabled);
  }

  return (
    <div className="dashboard-shell flex min-h-full flex-col">
      <a href="#main-content" className="dashboard-skip-link">Vai al contenuto</a>
      <header className="sticky top-0 z-10 border-b border-border backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
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

        <MenuNavigazione
          voci={NAV.filter(
            (item) =>
              (!item.modulo || moduliAttivi.has(item.modulo)) &&
              (item.href !== "/dashboard/banco" || banco)
          ).map(
            (item) => ({ href: item.href, label: item.label, fila: item.fila })
          )}
        />
      </header>

      <Notifiche />

      <AvvisoConformita serveDpa={serveDpa} datiMancanti={datiMancanti} />

      <div id="main-content" className="flex-1">{children}</div>
    </div>
  );
}
