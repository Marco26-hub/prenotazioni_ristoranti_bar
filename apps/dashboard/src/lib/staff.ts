import "server-only";
import { db } from "@repo/shared/db";
import bcrypt from "bcryptjs";
import type { StaffRole } from "@repo/shared";

export interface StaffUser {
  id: string;
  email: string;
  name: string | null;
}

export interface VenueMembership {
  venueId: string;
  venueName: string;
  role: StaffRole;
}

export async function verifyStaffCredentials(
  email: string,
  password: string
): Promise<StaffUser | null> {
  const sql = db();
  const [user] = await sql<
    { id: string; email: string; name: string | null; password_hash: string }[]
  >`select id, email, name, password_hash from users where email = ${email}`;

  if (!user) return null;
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name };
}

export async function membershipsForUser(userId: string): Promise<VenueMembership[]> {
  const sql = db();
  // ORDER BY esplicito: senza, quale venue sia session.venues[0] non è
  // garantito stabile tra una richiesta e l'altra per uno staff multi-locale.
  // Non è ancora un vero selettore locale in UI — solo un ordine deterministico.
  const rows = await sql<{ venue_id: string; venue_name: string; role: StaffRole }[]>`
    select v.id as venue_id, v.name as venue_name, vs.role
    from venue_staff vs
    join venues v on v.id = vs.venue_id
    where vs.user_id = ${userId}
    order by vs.created_at`;

  return rows.map((r) => ({ venueId: r.venue_id, venueName: r.venue_name, role: r.role }));
}
