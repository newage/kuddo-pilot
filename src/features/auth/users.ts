import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { users } from "@/db/schema";

// Створює користувача при першому вході (без ролі); email з ADMIN_EMAIL отримує admin.
export async function ensureUser(
  db: Db,
  profile: { email: string; name?: string | null },
  adminEmail: string,
) {
  const email = profile.email.toLowerCase();
  const isAdmin = email === adminEmail.toLowerCase();

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (!existing) {
    const [created] = await db
      .insert(users)
      .values({ email, name: profile.name ?? null, role: isAdmin ? "admin" : null })
      .returning();
    return created;
  }
  if (isAdmin && existing.role === null) {
    const [updated] = await db
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.id, existing.id))
      .returning();
    return updated;
  }
  return existing;
}

export async function findUserByEmail(db: Db, email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return user ?? null;
}
