"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireAdmin } from "@/features/auth/session";
import { getMessages } from "@/i18n/server";

// Server action викликається напряму, тож admin перевіряється тут, а не лише в layout.
export async function setUserRole(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (role !== "admin" && role !== "user") throw new Error((await getMessages()).errors.invalidRole);
  if (userId === admin.id) throw new Error((await getMessages()).errors.ownRole);

  await db.update(users).set({ role }).where(eq(users.id, userId));
  revalidatePath("/admin/users");
}
