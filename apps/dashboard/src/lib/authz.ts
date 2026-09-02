import "server-only";
import { auth } from "@/auth";
import type { StaffRole } from "@repo/shared";
import type { VenueMembership } from "./staff";

/**
 * Ogni Server Action è un endpoint POST raggiungibile da chiunque conosca
 * l'action id, non solo da chi vede il bottone in UI — va sempre riverificata
 * l'appartenenza al venue qui dentro, non solo a livello di pagina.
 */
export async function requireVenue(): Promise<{ userId: string; venue: VenueMembership }> {
  const session = await auth();
  const venue = session?.venues[0];
  if (!session?.user.id || !venue) {
    throw new Error("Non autorizzato");
  }
  return { userId: session.user.id, venue };
}

/**
 * Per azioni sensibili (dati fiscali, pagamenti, cancellazioni) non basta
 * "è staff di questo venue" — cameriere/cucina non devono poter toccare
 * queste operazioni solo perché conoscono l'action id.
 */
export async function requireRole(
  allowedRoles: StaffRole[]
): Promise<{ userId: string; venue: VenueMembership }> {
  const result = await requireVenue();
  if (!allowedRoles.includes(result.venue.role)) {
    throw new Error("Permessi insufficienti per questa operazione");
  }
  return result;
}
