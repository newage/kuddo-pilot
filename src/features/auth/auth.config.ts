import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-безпечна частина конфігурації (без БД): використовується в middleware.
export const authConfig = {
  providers: [Google],
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname === "/login") return true;
      if (auth?.user) return true;
      // API відповідає 401, а не редиректом на сторінку входу
      if (pathname.startsWith("/api/")) return Response.json({ error: "Потрібен вхід" }, { status: 401 });
      return false;
    },
  },
} satisfies NextAuthConfig;
