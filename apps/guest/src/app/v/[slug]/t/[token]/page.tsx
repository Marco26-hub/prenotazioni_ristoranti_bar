import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@repo/shared/db";
import { resolveTableFromQr } from "@/lib/table";
import { OrderMenu } from "./order-menu";
import { AnnuncioLocale } from "./annuncio";
import { annuncioAttivo } from "@/lib/annuncio";
import { gruppiPerPiatti } from "@repo/shared/varianti";
import { type Conservazione } from "@repo/shared/bevande";
import { traduci, type Traduzioni } from "@repo/shared/lingue";
import { linguaContenuto } from "@repo/shared/i18n";
import { LinguaProvider } from "@repo/shared/i18n/contesto";
import { notaConservazioneTradotta, tComune } from "@repo/shared/i18n/comune";
import { linguaPagina } from "@/lib/lingua";
import { tTavolo } from "@/i18n/tavolo";
import { SelettoreLinguaUI } from "@/app/_i18n/selettore";
import { Bill } from "./bill";
import { Recensione } from "./recensione";
import { NumeroRitiro } from "./numero-ritiro";
import { Coperti } from "./coperti";

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
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug, token } = await params;
  const { lang } = await searchParams;

  const resolved = await resolveTableFromQr(slug, token);
  if (!resolved) notFound();

  // La lingua dell'interfaccia: il link esplicito, poi il cookie, poi la
  // lingua del telefono, e per ultima quella che il locale ha scelto per sé.
  // Chi inquadra il QR non deve cercare il selettore.
  //
  // Il locale si legge prima apposta: la sua preferenza serve proprio nel
  // caso in cui il telefono non parla né italiano né inglese, e senza
  // passarla qui l'impostazione non farebbe niente.
  const lingua = await linguaPagina(lang, resolved.venue.lingua_predefinita);
  const t = tTavolo(lingua);
  // Coperto e servizio vengono dal dizionario comune: la stessa frase la
  // scrive anche la carta pubblica, e devono coincidere.
  const tc = tComune(lingua);

  const sql = db();

  const categories = await sql<
    { id: string; name: string; sort_order: number; translations: Traduzioni | null }[]
  >`
    select id, name, sort_order, translations from menu_categories
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
      serving_note: string | null;
      translations: Traduzioni | null;
    }[]
  >`
    select id, category_id, name, description, price_cents, allergens,
           (image_url is not null) as ha_foto,
           dietary_tags, ingredients, pairing_item_id, conservation, origin_note,
           kind, producer, vintage, denomination, origin, abv, serving_note,
           translations,
           fuori_formula
    from menu_items
    where venue_id = ${resolved.venue.id} and available = true
    order by sort_order`;

  const { venue } = resolved;

  /*
   * Il tavolo sta pagando a formula?
   *
   * Serve al menu, non al conto: le voci fuori formula vanno segnate mentre
   * si ordina, non scoperte alla fine. Un caffè che compare sul conto di un
   * all you can eat, senza che il menu l'avesse detto, è la discussione che
   * il cameriere si trova a fare al momento di pagare.
   */
  // Il numero sul telefono lo mostra solo chi ha scelto quel metodo: chi
  // consegna un segnaposto non vuole un secondo canale che dica cose
  // leggermente diverse.
  const avvisaSulTelefono =
    (venue.pickup_metodi ?? []).includes("telefono") &&
    Boolean(venue.pickup_numbering_enabled);

  /*
   * "Compreso nella formula" solo se la fascia in corso ha davvero un prezzo.
   *
   * Un locale che ha impostato la cena e lasciato il pranzo a zero, con un
   * tavolo seduto a mezzogiorno, faceva leggere "compreso" su ogni piatto e
   * poi mandava un conto alla carta: il conto arriva giusto, ma dopo aver
   * detto per un'ora che era compreso. La condizione è la stessa del conto.
   */
  const [statoFormula] = await sql<
    {
      a_formula: boolean;
      guest_count: number;
      coperti_dal_tavolo: boolean;
      coperti_confermati: boolean;
    }[]
  >`
    select ts.guest_count, ts.coperti_dal_tavolo, ts.coperti_confermati,
           (ts.formula and v.formula_attiva and
            case
              when (ts.opened_at at time zone coalesce(v.timezone, 'Europe/Rome'))::time
                   >= v.formula_ora_cena
              then v.formula_cena_cents else v.formula_pranzo_cents
            end > 0) as a_formula
      from table_sessions ts
      join venues v on v.id = ts.venue_id
     where ts.id = ${resolved.sessionId}`;
  const sessioneAFormula = Boolean(statoFormula?.a_formula);

  /*
   * La domanda si fa una volta e solo dove serve.
   *
   * Solo a formula: alla carta i coperti muovono il coperto, e chiederli a
   * chi si è appena seduto per due euro è una domanda di troppo. E non più
   * dopo che la sala ha confermato: quello che dice il personale non si
   * cambia dal tavolo.
   */
  const chiediCoperti =
    sessioneAFormula && !statoFormula?.coperti_confermati;
  const annuncio = await annuncioAttivo(venue.id);

  const nota = notaConservazioneTradotta(
    items.map((i) => i.conservation),
    lingua
  );

  // `languages` viaggia con il coperto perché è la stessa riga: le lingue in
  // cui il locale ha davvero tradotto il menu, che sono un'altra cosa dalle
  // due dell'interfaccia.
  const [supplementi] = await sql<
    {
      cover_charge_cents: number;
      service_percent: string;
      cover_charge_label: string | null;
      languages: string[] | null;
    }[]
  >`select cover_charge_cents, service_percent, cover_charge_label, languages
      from venues where id = ${venue.id}`;

  /*
   * I nomi dei piatti nella lingua di chi legge.
   *
   * Interfaccia e contenuto sono due sistemi separati — noi traduciamo i
   * pulsanti in due lingue, il ristoratore traduce la carta in dieci — ma
   * per il cliente sono la stessa pagina: "Add to order" sotto "Tagliata di
   * manzo" è metà pagina che non si capisce. Se il locale non ha tradotto
   * nella lingua richiesta resta l'italiano, che è quello che ha scritto lui.
   */
  const linguaMenu = linguaContenuto(lingua, supplementi?.languages ?? []);
  const categorieTradotte = categories.map((c) =>
    traduci(c, c.translations, linguaMenu)
  );
  const itemsTradotti = items.map((i) => traduci(i, i.translations, linguaMenu));

  /*
   * Varianti e aggiunte, caricate in blocco per tutti i piatti del menu — e
   * nella stessa lingua dei piatti.
   *
   * Sta dopo `linguaMenu` apposta: senza passargliela i gruppi tornavano in
   * italiano sotto un piatto tradotto, cioè "Cottura" e "Al sangue" dentro
   * una scheda inglese. Le scelte obbligatorie sono proprio quelle che il
   * cliente deve capire per ordinare.
   */
  const varianti = await gruppiPerPiatti(
    sql,
    venue.id,
    items.map((i) => i.id),
    linguaMenu
  );

  const itemsConVarianti = itemsTradotti.map((i) => ({
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
    <LinguaProvider lingua={lingua}>
      {/* `lang` anche qui, non solo in cima al documento: il layout non sa di
          che locale è questa pagina, quindi non conosce la lingua che il
          locale ha scelto per sé. Quando quella entra in gioco — un telefono
          che non parla né italiano né inglese — l'attributo in cima
          resterebbe indietro. `lang` vale su qualunque elemento, e il lettore
          di schermo guarda il più vicino. */}
      <div lang={lingua} className="flex min-h-full flex-col" style={brandStyle}>
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
          {/* Il selettore sta accanto al numero del tavolo, in cima: chi ha
              inquadrato il QR e legge una lingua che non è la sua deve
              trovarlo senza scorrere. */}
          <div className="flex shrink-0 items-center gap-2">
            <SelettoreLinguaUI attiva={lingua} />
            <span className="shrink-0 rounded-lg border border-accent bg-accent px-3 py-1.5 text-center text-xs font-medium text-accent-foreground">
              <span className="block text-[10px] uppercase tracking-wider opacity-80">
                {t("tavolo.etichetta")}
              </span>
              <span className="block text-base font-semibold">{resolved.table.code}</span>
            </span>
          </div>
          </div>
          <nav className="mt-3 flex gap-2" aria-label={t("nav.aria")}>
            <a href="#ordine" className="rounded-full border border-border px-4 py-2 text-sm font-medium">{t("nav.menu")}</a>
            <a href="#conto" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">{t("nav.paga")}</a>
          </nav>
        </div>
      </header>

      {annuncio && <AnnuncioLocale annuncio={annuncio} venueSlug={slug} />}

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
        {avvisaSulTelefono && <NumeroRitiro sessionId={resolved.sessionId} />}

        {chiediCoperti && (
          <Coperti
            sessionId={resolved.sessionId}
            iniziali={statoFormula?.guest_count ?? 1}
            dichiarati={Boolean(statoFormula?.coperti_dal_tavolo)}
          />
        )}

        <section id="ordine" aria-label={t("sezione.ordine")}>
          <OrderMenu
            sessionId={resolved.sessionId}
            currency={resolved.venue.currency}
            categories={categorieTradotte}
            items={itemsConVarianti}
            intervalloMin={venue.ordine_intervallo_min ?? 0}
            aFormula={sessioneAFormula}
          />
        </section>

        {/* Il coperto va indicato dove il cliente sceglie, non solo in
            fondo al conto: la norma sui prezzi lo mette alla pari di un
            piatto (R.D. 635/1940 art. 180). */}
        {(supplementi?.cover_charge_cents > 0 ||
          Number(supplementi?.service_percent ?? 0) > 0) && (
          <p className="mt-5 rounded-xl border border-border bg-surface p-3 text-sm text-muted">
            {supplementi.cover_charge_cents > 0 &&
              tc("coperto.riga", {
                etichetta:
                  supplementi.cover_charge_label?.trim() || tc("coperto.etichetta"),
                prezzo: t.prezzo(supplementi.cover_charge_cents, venue.currency),
              })}
            {Number(supplementi?.service_percent ?? 0) > 0 && (
              <>
                {supplementi.cover_charge_cents > 0 ? " " : ""}
                {tc("servizio.riga", {
                  percento: Number(supplementi.service_percent),
                })}
              </>
            )}
          </p>
        )}

        {nota && (
          <p className="mt-3 text-xs leading-relaxed text-muted">{nota}</p>
        )}

        {/* Dopo il conto: si chiede quando si è finito di mangiare, non
            mentre si sta ancora ordinando. */}
        <div id="conto" aria-label={t("sezione.conto")}>
          <Bill
            sessionId={resolved.sessionId}
            privacyHref={`/privacy/${slug}`}
            token={token}
          />
        </div>

        <Recensione token={token} />
      </main>

      <footer className="mx-auto w-full max-w-2xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <div className="space-y-2 border-t border-border pt-4 text-xs text-muted">
          {/* Dati del titolare: servono al cliente per contattare il locale e
              sono richiesti dall'informativa privacy, che indica il ristorante
              come titolare del trattamento. */}
          <p className="font-medium text-foreground">{venue.name}</p>
          {address && <p>{address}</p>}
          {venue.vat_number && <p>{t("footer.piva", { numero: venue.vat_number })}</p>}
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
              {t("footer.privacy")}
            </a>
            <a href="/termini" className="inline-block py-1.5 underline underline-offset-2">
              {t("footer.termini")}
            </a>
            <a href="/cookie" className="inline-block py-1.5 underline underline-offset-2">
              {t("footer.cookie")}
            </a>
          </p>
        </div>
      </footer>
    </div>
    </LinguaProvider>
  );
}
