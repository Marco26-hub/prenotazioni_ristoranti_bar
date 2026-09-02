import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";
import { resolveTableFromQr } from "@/lib/table";
import { OrderMenu } from "./order-menu";
import { Bill } from "./bill";

/**
 * Mai nei motori di ricerca: l'URL contiene il token stampato sul QR, e
 * indicizzarlo permetterebbe di aprire un conto senza essere al tavolo.
 * Il menu pubblico indicizzabile è /m/{slug}.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function TablePage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  const resolved = await resolveTableFromQr(slug, token);
  if (!resolved) notFound();

  const sql = db();

  const categories = await sql<{ id: string; name: string; sort_order: number }[]>`
    select id, name, sort_order from menu_categories
    where venue_id = ${resolved.venue.id}
    order by sort_order`;

  const items = await sql<
    {
      id: string;
      category_id: string | null;
      name: string;
      description: string | null;
      price_cents: number;
      allergens: string[] | null;
      image_url: string | null;
      dietary_tags: string[] | null;
      ingredients: string | null;
      pairing_item_id: string | null;
    }[]
  >`
    select id, category_id, name, description, price_cents, allergens, image_url,
           dietary_tags, ingredients, pairing_item_id
    from menu_items
    where venue_id = ${resolved.venue.id} and available = true
    order by sort_order`;

  const { venue } = resolved;

  // Il colore scelto dal locale sovrascrive l'accento di default solo per
  // questo sottoalbero: il prodotto è white-label, il cliente finale deve
  // vedere il marchio del ristorante.
  const brandStyle = venue.brand_color
    ? ({ "--accent": venue.brand_color } as React.CSSProperties)
    : undefined;

  const address = [venue.address, venue.address_zip, venue.address_city, venue.address_province]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex min-h-full flex-col" style={brandStyle}>
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {venue.logo_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={venue.logo_url}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg object-contain"
              />
            )}
            <h1 className="truncate text-lg font-semibold tracking-tight">{venue.name}</h1>
          </div>
          <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            Tavolo {resolved.table.code}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
        <OrderMenu
          sessionId={resolved.sessionId}
          currency={resolved.venue.currency}
          categories={categories}
          items={items}
        />

        <Bill sessionId={resolved.sessionId} />
      </main>

      <footer className="mx-auto w-full max-w-2xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <div className="space-y-2 border-t border-border pt-4 text-xs text-muted">
          {/* Dati del titolare: servono al cliente per contattare il locale e
              sono richiesti dall'informativa privacy, che indica il ristorante
              come titolare del trattamento. */}
          <p className="font-medium text-foreground">{venue.name}</p>
          {address && <p>{address}</p>}
          {venue.vat_number && <p>P.IVA {venue.vat_number}</p>}
          {(venue.public_phone || venue.public_email) && (
            <p className="flex flex-wrap gap-x-3">
              {venue.public_phone && (
                <a href={`tel:${venue.public_phone}`} className="inline-block py-1.5 underline underline-offset-2">
                  {venue.public_phone}
                </a>
              )}
              {venue.public_email && (
                <a href={`mailto:${venue.public_email}`} className="inline-block py-1.5 underline underline-offset-2">
                  {venue.public_email}
                </a>
              )}
            </p>
          )}
          <p className="flex gap-4 pt-1">
            <a href="/privacy" className="inline-block py-1.5 underline underline-offset-2">
              Privacy
            </a>
            <a href="/termini" className="inline-block py-1.5 underline underline-offset-2">
              Termini
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
