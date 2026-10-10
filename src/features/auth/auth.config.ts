import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe part of the config (no DB): used in middleware.
export const authConfig = {
  providers: [Google],
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname === "/login") return true;
      if (auth?.user) return true;
      // the API answers 401 instead of redirecting to the sign-in page
      if (pathname.startsWith("/api/")) return Response.json({ error: "Потрібен вхід" }, { status: 401 });
      return false;
    },
  },
} satisfies NextAuthConfig;
