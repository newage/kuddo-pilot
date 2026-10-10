import NextAuth from "next-auth";
import { authConfig } from "@/features/auth/auth.config";

const { auth } = NextAuth(authConfig);

// Лише автентифікація (edge, без БД). Роль перевіряється на сервері в requireUser/requireAdmin.
export default auth;

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
