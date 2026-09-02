import "server-only";
import { auth } from "@/auth";
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
