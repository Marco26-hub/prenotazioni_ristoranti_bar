import type { VenueMembership } from "@/lib/staff";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
    };
    venues: VenueMembership[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    venues: VenueMembership[];
  }
}
