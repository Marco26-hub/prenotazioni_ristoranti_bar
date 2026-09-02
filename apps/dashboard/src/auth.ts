import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyStaffCredentials, membershipsForUser } from "@/lib/staff";

/**
 * Ogni quanto rileggere ruoli e locali dal DB. Con JWT stateless, senza
 * questo un dipendente rimosso da venue_staff resterebbe operativo fino
 * alla scadenza del token; con questo perde l'accesso entro pochi minuti,
 * senza però interrogare il DB a ogni singola richiesta.
 */
const REVALIDATE_AFTER_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await verifyStaffCredentials(email, password);
        if (!user) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
        token.venues = await membershipsForUser(user.id);
        token.venuesCheckedAt = Date.now();
        return token;
      }

      const stale =
        typeof token.venuesCheckedAt !== "number" ||
        Date.now() - token.venuesCheckedAt > REVALIDATE_AFTER_MS;

      if (token.userId && stale) {
        token.venues = await membershipsForUser(token.userId as string);
        token.venuesCheckedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
      }
      session.venues = token.venues as typeof session.venues;
      return session;
    },
  },
});
