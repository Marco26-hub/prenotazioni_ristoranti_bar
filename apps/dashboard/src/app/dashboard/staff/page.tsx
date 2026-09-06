import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { StaffList } from "./staff-list";
import { repartiDelLocale } from "@/lib/reparti-locale";
import { DispositiviLista } from "./dispositivi-lista";
import { AddStaffForm } from "./add-staff-form";
import { linguaUtente } from "@/lib/lingua";
import { tPersone } from "@/i18n/persone";
import { LinguaProvider } from "@repo/shared/i18n/contesto";

export default async function StaffPage() {
  const session = await auth();
  const lingua = await linguaUtente();
  const t = tPersone(lingua);

  // Le etichette dei ruoli: i valori a database restano owner/manager/…
  const ROLE_LABEL: Record<string, string> = {
    owner: t("ruolo.owner"),
    manager: t("ruolo.manager"),
    waiter: t("ruolo.waiter"),
    kitchen: t("ruolo.kitchen"),
  };

  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">{t("errore.nessun_locale")}</main>;

  if (venue.role !== "owner") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-5">
        <h1 className="mb-2 text-lg font-semibold">{t("personale.titolo")}</h1>
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          {t("personale.solo_titolare")}
        </p>
      </main>
    );
  }

  const sql = db();

  // Le postazioni sono del locale: chi ha il forno separato dalla
  // friggitoria le ha create lui, e i permessi devono offrire le sue.
  const repartiDisponibili = await repartiDelLocale(venue.venueId);
  const staff = await sql<
    {
      id: string;
      user_id: string;
      email: string;
      name: string | null;
      role: string;
      is_me: boolean;
      reparti: string[];
      codice_suffisso: string | null;
    }[]
  >`
    select vs.id, vs.user_id, u.email, u.name, vs.role, vs.reparti, vs.codice_suffisso,
           (u.id = ${session!.user.id}) as is_me
    from venue_staff vs
    join users u on u.id = vs.user_id
    where vs.venue_id = ${venue.venueId}
    order by vs.created_at`;

  const tavoli = await sql<{ id: string; code: string; assigned_to: string | null }[]>`
    select id, code, assigned_to from tables
     where venue_id = ${venue.venueId} and active = true
     order by code`;

  // Chi tiene un tavolo, per nome: sul badge serve il nome, non l'id.
  const nomePerUtente: Record<string, string> = {};
  for (const s of staff) nomePerUtente[s.user_id] = s.name ?? s.email;

  const dispositivi = await sql<
    {
      id: string;
      nome: string | null;
      reparto: string | null;
      utente: string | null;
      last_seen_at: Date;
    }[]
  >`
    select d.id, d.nome, d.reparto, d.last_seen_at,
           coalesce(u.name, u.email) as utente
      from venue_devices d
      left join users u on u.id = d.ultimo_utente
     where d.venue_id = ${venue.venueId}
     order by d.last_seen_at desc`;

  return (
    <LinguaProvider lingua={lingua}>
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        <div>
          <h1 className="text-lg font-semibold">{t("personale.titolo.completo")}</h1>
          <p className="mt-0.5 text-sm text-muted">{t("personale.sottotitolo")}</p>
        </div>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-1 font-semibold">{t("permessi.titolo")}</h2>
          <ul className="space-y-1.5 text-sm text-muted">
            <li>
              <strong className="text-foreground">{t("permessi.ruolo")}</strong> —{" "}
              {t("permessi.ruolo.a")} <em>{t("permessi.ruolo.pronto")}</em>
              {t("permessi.ruolo.b")} <em>{t("permessi.ruolo.servito")}</em>
              {t("permessi.ruolo.c")}
            </li>
            <li>
              <strong className="text-foreground">{t("permessi.rango")}</strong> —{" "}
              {t("permessi.rango.testo")}
            </li>
            <li>
              <strong className="text-foreground">{t("permessi.reparti")}</strong> —{" "}
              {t("permessi.reparti.testo")}
            </li>
            <li>
              <strong className="text-foreground">{t("permessi.dispositivo")}</strong> —{" "}
              {t("permessi.dispositivo.testo")}
            </li>
          </ul>
        </section>

        <StaffList
          repartiDisponibili={repartiDisponibili}
          staff={staff.map((s) => ({
            id: s.id,
            email: s.email,
            name: s.name,
            role: s.role,
            roleLabel: ROLE_LABEL[s.role] ?? s.role,
            isMe: s.is_me,
            userId: s.user_id,
            reparti: s.reparti ?? [],
            codice: s.codice_suffisso,
          }))}
          tavoli={tavoli.map((t) => ({
            id: t.id,
            code: t.code,
            assignedTo: t.assigned_to,
          }))}
          nomiPerUtente={nomePerUtente}
        />

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-1 font-semibold">{t("schermi.titolo")}</h2>
          <p className="mb-3 text-sm text-muted">{t("schermi.sottotitolo")}</p>
          <DispositiviLista
            dispositivi={dispositivi.map((d) => ({
              id: d.id,
              nome: d.nome,
              reparto: d.reparto,
              ultimoUtente: d.utente,
              ultimoAccesso: d.last_seen_at.toISOString(),
            }))}
          />
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-1 font-semibold">{t("aggiungi.titolo")}</h2>
          <p className="mb-3 text-sm text-muted">{t("aggiungi.sottotitolo")}</p>
          <AddStaffForm />
        </section>

        <section className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          <p className="mb-2 font-medium text-foreground">{t("ruoli.titolo")}</p>
          <ul className="space-y-1">
            <li>
              <strong>{t("ruolo.owner")}</strong> — {t("ruoli.owner.testo")}
            </li>
            <li>
              <strong>{t("ruolo.manager")}</strong> — {t("ruoli.manager.testo")}
            </li>
            <li>
              <strong>{t("ruolo.waiter")}</strong> {t("ruoli.e")}{" "}
              <strong>{t("ruolo.kitchen")}</strong> — {t("ruoli.sala_cucina.testo")}
            </li>
          </ul>
        </section>
      </main>
    </LinguaProvider>
  );
}
