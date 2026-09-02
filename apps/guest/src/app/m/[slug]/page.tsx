import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";
import { headers } from "next/headers";
import { scegliLingua, traduci, type Traduzioni } from "@repo/shared/lingue";
import { SelettoreLingua } from "./selettore-lingua";
import { Assistente } from "./assistente";
import { AnnuncioLocale } from "../../v/[slug]/t/[token]/annuncio";
import { annuncioAttivo } from "@/lib/annuncio";
import { MenuItemCard } from "./menu-item-card";
import { TemaMenu } from "./tema-menu";
import { hasModulo } from "@repo/shared";

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
  ha_foto: boolean;
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
  subscription_status: string;
  subscription_period_end: Date | null;
  modules: string[] | null;
}


async function loadVenue(slug: string) {
  const sql = db();
  const [venue] = await sql<VenuePublic[]>`
    select id, name, logo_url, brand_color, public_phone, public_email,
           address, address_zip, address_city, address_province, currency,
           languages, opening_hours, practical_info, assistant_enabled,
           subscription_status, subscription_period_end, modules
    from venues where slug = ${slug}`;
  if (
    !venue ||
    !hasModulo("ordini", venue.subscription_status, venue.subscription_period_end, venue.modules)
  ) return null;

  const categories = await sql<{ id: string; name: string; translations: Traduzioni }[]>`
    select id, name, translations from menu_categories where venue_id = ${venue.id}
     order by sort_order`;

  const items = await sql<PublicMenuItem[]>`
    select id, category_id, name, description, price_cents, translations,
           (image_url is not null) as ha_foto
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

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://ristoranti-guest.vercel.app";

  // Schema.org Restaurant + Menu: è ciò che permette a Google di mostrare il
  // menu come dato strutturato e agli assistenti AI di citarlo con i prezzi
  // giusti invece di indovinare.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: venue.name,
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
            // Nei dati strutturati serve un indirizzo assoluto: un data
            // URL lì dentro non è utilizzabile da nessun consumatore.
            ...(i.ha_foto ? { image: `${base}/api/foto/${i.id}` } : {}),
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
    <div className="menu-shell flex min-h-full flex-col" style={brandStyle}>
      {annuncio && <AnnuncioLocale annuncio={annuncio} venueSlug={slug} />}

      {venue.assistant_enabled && (
        <Assistente slug={slug} nomeLocale={venue.name} />
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="menu-header border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-9">
          <div className="flex items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              {venue.logo_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={venue.logo_url}
                  alt=""
                  width={72}
                  height={72}
                  className="h-16 w-16 shrink-0 rounded-lg object-contain sm:h-18 sm:w-18"
                />
              )}
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Menu</p>
                <h1 className="text-2xl font-semibold text-pretty sm:text-3xl">{venue.name}</h1>
                {address && <p className="mt-1 text-sm text-muted">{address}</p>}
              </div>
            </div>
            <TemaMenu />
          </div>

          {(venue.opening_hours || venue.practical_info) && (
            <div className="mt-5 max-w-2xl border-l-2 border-accent pl-4 text-sm leading-relaxed text-muted">
              {venue.opening_hours && <p className="whitespace-pre-line">{venue.opening_hours}</p>}
              {venue.practical_info && <p className="mt-1">{venue.practical_info}</p>}
            </div>
          )}

          <div className="mt-6">
            <SelettoreLingua base={`/m/${slug}`} attiva={lingua} disponibili={venue.languages ?? []} />
          </div>
        </div>
      </header>

      <nav className="menu-category-nav sticky top-0 z-20 border-b border-border" aria-label="Categorie del menu">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {categories.map((cat) => (
            <a key={cat.id} href={`#categoria-${cat.id}`} className="shrink-0 rounded-full px-4 py-2 text-sm font-medium hover:bg-surface">
              {cat.name}
            </a>
          ))}
          <a href="#informazioni" className="shrink-0 rounded-full px-4 py-2 text-sm text-muted hover:bg-surface">Info</a>
        </div>
      </nav>

      <main id="menu" className="mx-auto w-full max-w-5xl flex-1 space-y-12 px-4 py-9 sm:px-6 sm:py-12">
        {categories.map((cat) => {
          const catItems = itemsByCategory.get(cat.id) ?? [];
          if (catItems.length === 0) return null;
          return (
            <section key={cat.id} id={`categoria-${cat.id}`} className="scroll-mt-20">
              <div className="mb-4 flex items-center gap-4">
                <h2 className="menu-section-title shrink-0 font-semibold text-pretty">
                  {cat.name}
                </h2>
                <span className="menu-section-rule h-px flex-1" aria-hidden="true" />
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {catItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    name={item.name}
                    description={item.description}
                    priceCents={item.price_cents}
                    currency={venue.currency}
                    imageUrl={item.ha_foto ? `/api/foto/${item.id}` : null}
                  />
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

      </main>

      <footer id="informazioni" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 pb-10 pt-2 sm:px-6">
        <div className="space-y-2 border-t border-border pt-6 text-sm text-muted">
          <p className="font-medium text-foreground">{venue.name}</p>
          {address && <p>{address}</p>}
          <p className="flex flex-wrap justify-center gap-x-4">
            <a href={`/privacy/${slug}`} className="inline-block py-1.5 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              Privacy
            </a>
            <a href="/cookie" className="inline-block py-1.5 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
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
