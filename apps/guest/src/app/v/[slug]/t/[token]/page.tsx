import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";
import { resolveTableFromQr } from "@/lib/table";
import { formatPriceCents } from "@repo/shared";
import { OrderMenu } from "./order-menu";
import { AnnuncioLocale } from "./annuncio";
import { annuncioAttivo } from "@/lib/annuncio";
import { gruppiPerPiatti } from "@repo/shared/varianti";
import { notaConservazione, type Conservazione } from "@repo/shared/bevande";
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
      ha_foto: boolean;
      dietary_tags: string[] | null;
      ingredients: string | null;
      pairing_item_id: string | null;
      conservation: Conservazione;
      origin_note: string | null;
      kind: string;
      producer: string | null;
      vintage: number | null;
      denomination: string | null;
      origin: string | null;
      abv: string | null;
    }[]
  >`
    select id, category_id, name, description, price_cents, allergens,
           (image_url is not null) as ha_foto,
           dietary_tags, ingredients, pairing_item_id, conservation, origin_note,
           kind, producer, vintage, denomination, origin, abv
    from menu_items
    where venue_id = ${resolved.venue.id} and available = true
    order by sort_order`;

  const { venue } = resolved;
  const annuncio = await annuncioAttivo(venue.id);

  // Varianti e aggiunte, caricate in blocco per tutti i piatti del menu.
  const varianti = await gruppiPerPiatti(
    sql,
    venue.id,
    items.map((i) => i.id)
  );
  const nota = notaConservazione(items.map((i) => i.conservation));

  const [supplementi] = await sql<
    {
      cover_charge_cents: number;
      service_percent: string;
      cover_charge_label: string | null;
    }[]
  >`select cover_charge_cents, service_percent, cover_charge_label
      from venues where id = ${venue.id}`;

  const itemsConVarianti = items.map((i) => ({
    ...i,
    gruppi: varianti.get(i.id) ?? [],
  }));

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
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
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
          <nav className="mt-3 flex gap-2" aria-label="Navigazione tavolo">
            <a href="#ordine" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">Ordina</a>
            <a href="#conto" className="rounded-full border border-border px-4 py-2 text-sm font-medium">Il conto</a>
            <a href={`/m/${slug}`} className="rounded-full border border-border px-4 py-2 text-sm text-muted">Menu</a>
          </nav>
        </div>
      </header>

      {annuncio && <AnnuncioLocale annuncio={annuncio} venueSlug={slug} />}

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
        <section id="ordine" aria-label="Ordina dal tavolo">
          <OrderMenu
            sessionId={resolved.sessionId}
            currency={resolved.venue.currency}
            categories={categories}
            items={itemsConVarianti}
          />
        </section>

        {/* Il coperto va indicato dove il cliente sceglie, non solo in
            fondo al conto: la norma sui prezzi lo mette alla pari di un
            piatto (R.D. 635/1940 art. 180). */}
        {(supplementi?.cover_charge_cents > 0 ||
          Number(supplementi?.service_percent ?? 0) > 0) && (
          <p className="mt-5 rounded-xl border border-border bg-surface p-3 text-sm text-muted">
            {supplementi.cover_charge_cents > 0 && (
              <>
                {supplementi.cover_charge_label?.trim() || "Coperto"}{" "}
                {formatPriceCents(supplementi.cover_charge_cents, venue.currency)} a
                persona.
              </>
            )}
            {Number(supplementi?.service_percent ?? 0) > 0 && (
              <>
                {supplementi.cover_charge_cents > 0 ? " " : ""}
                Servizio {Number(supplementi.service_percent)}% sull&apos;ordinato.
              </>
            )}
          </p>
        )}

        {nota && (
          <p className="mt-3 text-xs leading-relaxed text-muted">{nota}</p>
        )}

        <div id="conto" aria-label="Conto e pagamento">
          <Bill sessionId={resolved.sessionId} privacyHref={`/privacy/${slug}`} />
        </div>
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
            <a href={`/privacy/${slug}`} className="inline-block py-1.5 underline underline-offset-2">
              Privacy
            </a>
            <a href="/termini" className="inline-block py-1.5 underline underline-offset-2">
              Termini
            </a>
            <a href="/cookie" className="inline-block py-1.5 underline underline-offset-2">
              Cookie
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
