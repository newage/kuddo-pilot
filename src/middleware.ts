import NextAuth from "next-auth";
import { authConfig } from "@/features/auth/auth.config";

const { auth } = NextAuth(authConfig);

// Authentication only (edge, no DB). The role is checked on the server in requireUser/requireAdmin.
export default auth;

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
