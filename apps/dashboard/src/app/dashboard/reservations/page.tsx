import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { emailConfigurata } from "@repo/shared/email";
import { LinguaProvider } from "@repo/shared/i18n/contesto";
import { linguaUtente } from "@/lib/lingua";
import { tPrenotazioni, meseAnno, giornoLungo } from "@/i18n/prenotazioni";
import { addReservation } from "./actions";
import { CardPrenotazione, type Prenotazione } from "./card-prenotazione";
import { moduloAttivo } from "@/lib/authz";
import { ModuloNonAttivo } from "../modulo-non-attivo";

interface Riga {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  party_size: number;
  reserved_at: Date;
  notes: string | null;
  status: string;
  decline_reason: string | null;
  guest_notified_at: Date | null;
  guest_notify_error: string | null;
  venue_notify_error: string | null;
  table_codes: string[];
}

/** Stati che occupano davvero un posto in sala. */
const OCCUPANO = new Set(["pending", "confirmed", "seated"]);

/** Le colonne del calendario, da lunedì (convenzione italiana). */
const GIORNI_SETTIMANA = [
  "calendario.giorno.lun",
  "calendario.giorno.mar",
  "calendario.giorno.mer",
  "calendario.giorno.gio",
  "calendario.giorno.ven",
  "calendario.giorno.sab",
  "calendario.giorno.dom",
] as const;

function iso(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default async function ReservationsPage({
  searchParams,
}: PageProps<"/dashboard/reservations">) {
  const lingua = await linguaUtente();
  const t = tPrenotazioni(lingua);

  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">{t("pagina.nessun_locale")}</main>;

  // Il modulo si verifica qui e non solo nel menu: chi digita
  // l'indirizzo la pagina la otterrebbe lo stesso.
  if (!(await moduloAttivo(venue.venueId, "prenotazioni"))) {
    return <ModuloNonAttivo modulo="prenotazioni" />;
  }

  const params = await searchParams;
  const richiesto = Array.isArray(params.giorno) ? params.giorno[0] : params.giorno;
  const giornoSelezionato =
    typeof richiesto === "string" && /^\d{4}-\d{2}-\d{2}$/.test(richiesto)
      ? richiesto
      : iso(new Date());

  const [anno, mese, giorno] = giornoSelezionato.split("-").map(Number);
  const dataSelezionata = new Date(anno, mese - 1, giorno);

  const sql = db();
  const [locale] = await sql<
    {
      reservation_email: string | null;
      public_email: string | null;
      reservation_capacity: number | null;
    }[]
  >`select reservation_email, public_email, reservation_capacity
      from venues where id = ${venue.venueId}`;

  // Il mese mostrato segue il giorno selezionato, così spostandosi avanti o
  // indietro il calendario resta coerente con la lista sotto.
  const primoDelMese = new Date(anno, mese - 1, 1);
  const ultimoDelMese = new Date(anno, mese, 0);

  const righe = await sql<Riga[]>`
    select id, customer_name, customer_phone, customer_email, party_size,
           reserved_at, notes, status, decline_reason,
           guest_notified_at, guest_notify_error, venue_notify_error,
           coalesce((
             select array_agg(t.code order by t.code)
               from reservation_tables rt
               join tables t on t.id = rt.table_id
              where rt.reservation_id = reservations.id
           ), array[]::text[]) as table_codes
      from reservations
     where venue_id = ${venue.venueId}
       and reserved_at >= ${primoDelMese}
       and reserved_at < ${new Date(anno, mese, 1)}
     order by reserved_at`;

  const perGiorno = new Map<string, { n: number; coperti: number; daConfermare: number }>();
  for (const r of righe) {
    const k = iso(r.reserved_at);
    const acc = perGiorno.get(k) ?? { n: 0, coperti: 0, daConfermare: 0 };
    if (OCCUPANO.has(r.status)) {
      acc.n += 1;
      acc.coperti += r.party_size;
      if (r.status === "pending") acc.daConfermare += 1;
    }
    perGiorno.set(k, acc);
  }

  const delGiorno = righe.filter((r) => iso(r.reserved_at) === giornoSelezionato);
  const copertiDelGiorno = delGiorno
    .filter((r) => OCCUPANO.has(r.status))
    .reduce((s, r) => s + r.party_size, 0);

  const daConfermareTotali = righe.filter((r) => r.status === "pending").length;

  // Lunedì come primo giorno della settimana (convenzione italiana).
  const offsetIniziale = (primoDelMese.getDay() + 6) % 7;

  const spostaMese = (delta: number) => {
    const d = new Date(anno, mese - 1 + delta, 1);
    return iso(d);
  };

  const prenotazioni: Prenotazione[] = delGiorno.map((r) => ({
    id: r.id,
    nome: r.customer_name,
    telefono: r.customer_phone,
    email: r.customer_email,
    coperti: r.party_size,
    quando: r.reserved_at.toISOString(),
    note: r.notes,
    stato: r.status,
    motivoRifiuto: r.decline_reason,
    avvisatoIl: r.guest_notified_at ? r.guest_notified_at.toISOString() : null,
    erroreAvviso: r.guest_notify_error,
    erroreAvvisoLocale: r.venue_notify_error,
    tavoli: r.table_codes,
  }));

  const indirizzoRichieste = locale?.reservation_email ?? locale?.public_email;

  return (
    <LinguaProvider lingua={lingua}>
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-semibold">{t("pagina.titolo")}</h1>
          {daConfermareTotali > 0 && (
            <span className="rounded-full border border-amber-400 px-3 py-1 text-sm text-amber-700">
              {t("pagina.da_confermare_mese", { n: daConfermareTotali })}
            </span>
          )}
        </div>

        {(!emailConfigurata() || !indirizzoRichieste) && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {!emailConfigurata()
              ? t("avviso.email_non_configurata")
              : t("avviso.indirizzo_mancante")}
          </p>
        )}

        {/* Senza capienza dichiarata il sistema non puo dire di no con
            cognizione e accetta tutto: e la scelta giusta — meglio far
            decidere una persona che rifiutare a caso — ma va detto, altrimenti
            il ristoratore crede di avere una protezione che non ha. */}
        {locale?.reservation_capacity === null && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {t("avviso.capienza.testo")}{" "}
            <strong>{t("avviso.capienza.percorso")}</strong>{" "}
            {t("avviso.capienza.coda")}
          </p>
        )}

        {/* --- Calendario ---------------------------------------------- */}
        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <a
              href={`/dashboard/reservations?giorno=${spostaMese(-1)}`}
              aria-label={t("calendario.mese_precedente")}
              className="flex min-h-11 w-11 items-center justify-center rounded-full border border-border"
            >
              ←
            </a>
            <p className="font-medium">{meseAnno(primoDelMese, lingua)}</p>
            <a
              href={`/dashboard/reservations?giorno=${spostaMese(1)}`}
              aria-label={t("calendario.mese_successivo")}
              className="flex min-h-11 w-11 items-center justify-center rounded-full border border-border"
            >
              →
            </a>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
            {GIORNI_SETTIMANA.map((g) => (
              <div key={g} className="py-1">
                {t(g)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: offsetIniziale }, (_, i) => (
              <div key={`vuoto-${i}`} />
            ))}

            {Array.from({ length: ultimoDelMese.getDate() }, (_, i) => {
              const g = i + 1;
              const k = iso(new Date(anno, mese - 1, g));
              const d = perGiorno.get(k);
              const selezionato = k === giornoSelezionato;

              return (
                <a
                  key={k}
                  href={`/dashboard/reservations?giorno=${k}`}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-lg border p-1 text-sm ${
                    selezionato
                      ? "border-accent bg-accent text-accent-foreground"
                      : d?.daConfermare
                        ? "border-amber-400"
                        : "border-border"
                  }`}
                >
                  <span className="tabular-nums">{g}</span>
                  {d && d.n > 0 && (
                    <span
                      className={`text-[10px] tabular-nums ${selezionato ? "" : "text-muted"}`}
                    >
                      {t("calendario.sintesi", { p: d.n, c: d.coperti })}
                    </span>
                  )}
                  {d && d.daConfermare > 0 && !selezionato && (
                    <span className="text-[10px] text-amber-700">
                      {t("calendario.da_confermare", { n: d.daConfermare })}
                    </span>
                  )}
                </a>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-muted">{t("calendario.legenda")}</p>
        </section>

        {/* --- Giorno selezionato --------------------------------------- */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">{giornoLungo(dataSelezionata, lingua)}</h2>
            <p className="text-sm text-muted">
              {t("giorno.coperti", { n: copertiDelGiorno })}
            </p>
          </div>

          {prenotazioni.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
              {t("giorno.vuoto")}
            </p>
          ) : (
            <ul className="space-y-3">
              {prenotazioni.map((p) => (
                <CardPrenotazione key={p.id} p={p} />
              ))}
            </ul>
          )}
        </section>

        {/* --- Inserimento manuale -------------------------------------- */}
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-1 font-semibold">{t("aggiungi.titolo")}</h2>
          <p className="mb-3 text-sm text-muted">{t("aggiungi.spiegazione")}</p>
          <form action={addReservation} className="space-y-2">
            <input
              name="customerName"
              placeholder={t("aggiungi.nome")}
              required
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name="reservedAt"
                type="datetime-local"
                required
                aria-label={t("aggiungi.quando")}
                className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
              />
              <input
                name="partySize"
                type="number"
                min="1"
                defaultValue={2}
                required
                aria-label={t("aggiungi.persone")}
                className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name="phone"
                type="tel"
                placeholder={t("aggiungi.telefono")}
                className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
              />
              <input
                name="email"
                type="email"
                placeholder={t("aggiungi.email")}
                className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
              />
            </div>
            <input
              name="notes"
              placeholder={t("aggiungi.note")}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
            />
            <button
              type="submit"
              className="min-h-11 w-full rounded-full bg-accent font-medium text-accent-foreground"
            >
              {t("aggiungi.invia")}
            </button>
          </form>
        </section>
      </main>
    </LinguaProvider>
  );
}
