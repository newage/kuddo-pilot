import { redirect } from "next/navigation";
import { auth } from "./auth";

// Для сторінок: неавторизований → /login, без ролі → /waiting.
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.role) redirect("/waiting");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/chat");
  return user;
}
