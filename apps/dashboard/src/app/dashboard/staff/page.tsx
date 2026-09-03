import { auth } from "@/auth";
import { db } from "@repo/shared/db";
import { StaffList } from "./staff-list";
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
    }[]
  >`
    select vs.id, vs.user_id, u.email, u.name, vs.role,
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

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
      <h1 className="text-lg font-semibold">Personale</h1>

      <StaffList
        staff={staff.map((s) => ({
          id: s.id,
          email: s.email,
          name: s.name,
          role: s.role,
          roleLabel: ROLE_LABEL[s.role] ?? s.role,
          isMe: s.is_me,
          userId: s.user_id,
        }))}
        tavoli={tavoli.map((t) => ({
          id: t.id,
          code: t.code,
          assignedTo: t.assigned_to,
        }))}
        nomiPerUtente={nomePerUtente}
      />

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
