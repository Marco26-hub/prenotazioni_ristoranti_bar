import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Tavoli" },
  { href: "/dashboard/orders", label: "Ordini" },
  { href: "/dashboard/menu", label: "Menu" },
  { href: "/dashboard/tables", label: "Gestione tavoli" },
  { href: "/dashboard/reservations", label: "Prenotazioni" },
  { href: "/dashboard/settings", label: "Impostazioni" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="border-b">
        <div className="mx-auto flex max-w-4xl gap-4 overflow-x-auto p-4 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap hover:underline">
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
