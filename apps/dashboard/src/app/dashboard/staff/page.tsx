import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { StaffList } from "./staff-list";
import { DispositiviLista } from "./dispositivi-lista";
import { AddStaffForm } from "./add-staff-form";

const ROLE_LABEL: Record<string, string> = {
  owner: "Titolare",
  manager: "Responsabile",
  waiter: "Sala",
  kitchen: "Cucina",
};

export default async function StaffPage() {
  const session = await auth();
  const venue = session?.venues[0];
  if (!venue) return <main className="p-4">Nessun locale associato.</main>;

  if (venue.role !== "owner") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-5">
        <h1 className="mb-2 text-lg font-semibold">Personale</h1>
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          Solo il titolare può gestire gli accessi del personale.
        </p>
      </main>
    );
  }

  const sql = db();
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
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
      <div>
        <h1 className="text-lg font-semibold">Personale e dispositivi</h1>
        <p className="mt-0.5 text-sm text-muted">
          Chi può entrare, cosa può toccare, e su quali schermi gira il
          servizio.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-semibold">Come funzionano i permessi</h2>
        <ul className="space-y-1.5 text-sm text-muted">
          <li>
            <strong className="text-foreground">Ruolo</strong> — cosa può
            dichiarare. La cucina segna <em>pronto</em>, la sala segna{" "}
            <em>servito</em>: farle dire a chiunque svuota entrambe. Titolare e
            responsabile fanno tutto.
          </li>
          <li>
            <strong className="text-foreground">Rango</strong> — quali tavoli
            vede per primi sul palmare. È una vista, non un divieto: con un
            tocco passa a tutta la sala se un tavolo altrui chiama.
          </li>
          <li>
            <strong className="text-foreground">Reparti</strong> — su cosa può
            agire davvero. Un barista senza il reparto cucina vede i primi ma
            non può spostarli. Nessuna spunta significa tutti.
          </li>
          <li>
            <strong className="text-foreground">Dispositivo</strong> — cosa
            mostra quello schermo. Appartiene al monitor, non alla persona.
          </li>
        </ul>
      </section>

      <StaffList
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
        <h2 className="mb-1 font-semibold">Schermi in servizio</h2>
        <p className="mb-3 text-sm text-muted">
          I monitor che stanno lavorando adesso e su cosa sono impostati.
        </p>
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
        <h2 className="mb-1 font-semibold">Aggiungi una persona</h2>
        <p className="mb-3 text-sm text-muted">
          Scegli tu una password e comunicagliela: potrà cambiarla da
          Impostazioni al primo accesso. Non inviamo ancora email di invito.
        </p>
        <AddStaffForm />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <p className="mb-2 font-medium text-foreground">Cosa può fare ogni ruolo</p>
        <ul className="space-y-1">
          <li>
            <strong>Titolare</strong> — tutto, compresi pagamenti, dati fiscali e
            gestione del personale.
          </li>
          <li>
            <strong>Responsabile</strong> — menu, tavoli, dati fiscali e
            pagamenti. Non gestisce il personale.
          </li>
          <li>
            <strong>Sala</strong> e <strong>Cucina</strong> — ordini, prenotazioni
            e disponibilità dei piatti. Non toccano pagamenti né dati fiscali.
          </li>
        </ul>
      </section>
    </main>
  );
}
