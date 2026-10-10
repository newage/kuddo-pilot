import NextAuth from "next-auth";
import { db } from "@/db/client";
import { env } from "@/lib/env";
import { authConfig } from "./auth.config";
import { ensureUser, findUserByEmail } from "./users";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "admin" | "user" | null; email: string; name?: string | null };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, profile }) {
      if (!user.email || profile?.email_verified !== true) return false;
      await ensureUser(db, { email: user.email, name: user.name }, env().ADMIN_EMAIL);
      return true;
    },
    // The role is read from the DB on every request, so a change by an admin takes effect without signing in again.
    async jwt({ token }) {
      if (token.email) {
        const user = await findUserByEmail(db, token.email);
        token.uid = user?.id;
        token.role = user?.role ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = (token.role as "admin" | "user" | null) ?? null;
      return session;
    },
  },
});
