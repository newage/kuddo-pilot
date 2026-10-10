"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { roleTeachers } from "@/db/schema";
import { requireAdmin } from "@/features/auth/session";
import { getMessages } from "@/i18n/server";

async function parse(formData: FormData) {
  const role = String(formData.get("role") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  if (role !== "admin" && role !== "user") throw new Error((await getMessages()).errors.invalidRole);
  return { role, teacherId } as const;
}

export async function grantAccess(formData: FormData) {
  await requireAdmin();
  const { role, teacherId } = await parse(formData);
  await db.insert(roleTeachers).values({ role, teacherId }).onConflictDoNothing();
  revalidatePath("/admin/access");
}

export async function revokeAccess(formData: FormData) {
  await requireAdmin();
  const { role, teacherId } = await parse(formData);
  await db
    .delete(roleTeachers)
    .where(and(eq(roleTeachers.role, role), eq(roleTeachers.teacherId, teacherId)));
  revalidatePath("/admin/access");
}
