import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";
import { headers } from "next/headers";
import { formatPriceCents } from "@repo/shared";
import { scegliLingua, traduci, type Traduzioni } from "@repo/shared/lingue";
import { SelettoreLingua } from "./selettore-lingua";
import { Assistente } from "./assistente";
import { AnnuncioLocale } from "../../v/[slug]/t/[token]/annuncio";
import { annuncioAttivo } from "@/lib/annuncio";

/**
 * Menu pubblico del locale, indicizzabile.
 *
 * Le pagine tavolo (/v/...) sono volutamente escluse dai motori: contengono
 * il token del QR e non hanno senso in una ricerca. Questa invece è il menu
 * come contenuto pubblico — è ciò che le persone cercano davvero ("cosa si
 * mangia da X") e ciò che gli assistenti AI citano, quindi porta visibilità
 * al locale senza esporre nulla.
 */

interface PublicMenuItem {
  id: string;
  translations?: Traduzioni;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
}

interface VenuePublic {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  public_phone: string | null;
  public_email: string | null;
  address: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_province: string | null;
  currency: string;
  languages: string[];
  opening_hours: string | null;
  practical_info: string | null;
  assistant_enabled: boolean;
}

async function loadVenue(slug: string) {
  const sql = db();
  const [venue] = await sql<VenuePublic[]>`
    select id, name, logo_url, brand_color, public_phone, public_email,
           address, address_zip, address_city, address_province, currency,
           languages, opening_hours, practical_info, assistant_enabled
    from venues where slug = ${slug}`;
  if (!venue) return null;

  const categories = await sql<{ id: string; name: string; translations: Traduzioni }[]>`
    select id, name, translations from menu_categories where venue_id = ${venue.id}
     order by sort_order`;

  const items = await sql<PublicMenuItem[]>`
    select id, category_id, name, description, price_cents, image_url, translations
    from menu_items
    where venue_id = ${venue.id} and available = true
    order by sort_order`;

  return { venue, categories, items };
}

export async function generateMetadata({
  params,
}: PageProps<"/m/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadVenue(slug);
  if (!data) return { title: "Menu non trovato" };

  const city = data.venue.address_city;
  const title = city ? `Menu di ${data.venue.name} — ${city}` : `Menu di ${data.venue.name}`;
  const sample = data.items.slice(0, 4).map((i) => i.name).join(", ");

  return {
    title,
    description: sample
      ? `Il menu aggiornato di ${data.venue.name}${city ? ` a ${city}` : ""}: ${sample} e altro, con i prezzi.`
      : `Il menu di ${data.venue.name}.`,
    alternates: { canonical: `/m/${slug}` },
    openGraph: {
      title,
      type: "website",
      description: `Menu e prezzi di ${data.venue.name}.`,
    },
  };
}

export default async function PublicMenuPage({
  params,
  searchParams,
}: PageProps<"/m/[slug]">) {
  const { slug } = await params;
  const data = await loadVenue(slug);
  if (!data) notFound();

  const { venue, categories: categorieBase, items: itemsBase } = data;
  const annuncio = await annuncioAttivo(venue.id);

  // La lingua chiesta esplicitamente vince sul browser; il browser vince
  // sull'italiano. Solo fra quelle che il locale ha davvero tradotto.
  const sp = await searchParams;
  const richiesta = Array.isArray(sp.lang) ? sp.lang[0] : sp.lang;
  const accept = (await headers()).get("accept-language");
  const lingua = scegliLingua(richiesta, accept, venue.languages ?? []);

  const categories = categorieBase.map((c) => traduci(c, c.translations, lingua));
  const items = itemsBase.map((i) => traduci(i, i.translations, lingua));

  const itemsByCategory = new Map<string | null, PublicMenuItem[]>();
  for (const item of items) {
    const key = item.category_id;
    if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
    itemsByCategory.get(key)!.push(item);
  }

  const address = [venue.address, venue.address_zip, venue.address_city, venue.address_province]
    .filter(Boolean)
    .join(" ");

  // Schema.org Restaurant + Menu: è ciò che permette a Google di mostrare il
  // menu come dato strutturato e agli assistenti AI di citarlo con i prezzi
  // giusti invece di indovinare.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: venue.name,
    acceptsReservations: "True",
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `/p/${slug}`,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
      result: { "@type": "FoodEstablishmentReservation", name: `Tavolo da ${venue.name}` },
    },
    ...(venue.public_phone ? { telephone: venue.public_phone } : {}),
    ...(venue.public_email ? { email: venue.public_email } : {}),
    ...(venue.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: venue.address,
            postalCode: venue.address_zip ?? undefined,
            addressLocality: venue.address_city ?? undefined,
            addressRegion: venue.address_province ?? undefined,
            addressCountry: "IT",
          },
        }
      : {}),
    hasMenu: {
      "@type": "Menu",
      name: `Menu di ${venue.name}`,
      hasMenuSection: categories
        .map((cat) => ({
          "@type": "MenuSection",
          name: cat.name,
          hasMenuItem: (itemsByCategory.get(cat.id) ?? []).map((i) => ({
            "@type": "MenuItem",
            name: i.name,
            ...(i.description ? { description: i.description } : {}),
            ...(i.image_url ? { image: i.image_url } : {}),
            offers: {
              "@type": "Offer",
              price: (i.price_cents / 100).toFixed(2),
              priceCurrency: venue.currency,
            },
          })),
        }))
        .filter((s) => s.hasMenuItem.length > 0),
    },
  };

  const brandStyle = venue.brand_color
    ? ({ "--accent": venue.brand_color } as React.CSSProperties)
    : undefined;

  return (
    <div className="flex min-h-full flex-col" style={brandStyle}>
      {annuncio && <AnnuncioLocale annuncio={annuncio} venueSlug={slug} />}

      {venue.assistant_enabled && (
        <Assistente slug={slug} nomeLocale={venue.name} />
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-5">
          {venue.logo_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={venue.logo_url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg object-contain"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{venue.name}</h1>
            {address && <p className="text-sm text-muted">{address}</p>}
            <a
              href={`/p/${slug}`}
              className="mt-3 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground"
            >
              Prenota un tavolo
            </a>

            {venue.opening_hours && (
              <p className="mt-2 whitespace-pre-line text-sm text-muted">
                {venue.opening_hours}
              </p>
            )}
            {venue.practical_info && (
              <p className="mt-1 text-sm text-muted">{venue.practical_info}</p>
            )}

            <div className="mt-3">
              <SelettoreLingua
                base={`/m/${slug}`}
                attiva={lingua}
                disponibili={venue.languages ?? []}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-7 px-4 py-6">
        {categories.map((cat) => {
          const catItems = itemsByCategory.get(cat.id) ?? [];
          if (catItems.length === 0) return null;
          return (
            <section key={cat.id}>
              <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">
                {cat.name}
              </h2>
              <ul className="space-y-2.5">
                {catItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4"
                  >
                    {item.image_url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.image_url}
                        alt=""
                        loading="lazy"
                        className="h-20 w-20 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{item.name}</p>
                      {item.description && (
                        <p className="mt-0.5 text-sm leading-snug text-muted">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {formatPriceCents(item.price_cents, venue.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            Il menu non è ancora pubblicato.
          </p>
        )}

        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          Al tavolo puoi ordinare e pagare dal telefono inquadrando il QR code.
        </p>
      </main>

      <footer className="mx-auto w-full max-w-2xl px-4 pb-8 pt-2">
        <div className="space-y-1 border-t border-border pt-4 text-xs text-muted">
          <p className="font-medium text-foreground">{venue.name}</p>
          {address && <p>{address}</p>}
          <p className="flex flex-wrap justify-center gap-x-4">
            <a href={`/privacy/${slug}`} className="inline-block py-1.5 underline underline-offset-2">
              Privacy
            </a>
            <a href="/cookie" className="inline-block py-1.5 underline underline-offset-2">
              Cookie
            </a>
          </p>
          {venue.public_phone && (
            <p>
              <a href={`tel:${venue.public_phone}`} className="inline-block py-1.5 underline underline-offset-2">
                {venue.public_phone}
              </a>
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
