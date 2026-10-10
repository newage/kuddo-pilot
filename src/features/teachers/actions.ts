"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { teachers } from "@/db/schema";
import { requireAdmin } from "@/features/auth/session";
import { getMessages } from "@/i18n/server";

async function parseTeacher(formData: FormData) {
  const field = (key: string) => String(formData.get(key) ?? "").trim();
  const value = { name: field("name"), subject: field("subject"), prompt: field("prompt") };
  if (!value.name || !value.subject || !value.prompt) throw new Error((await getMessages()).errors.fillTeacher);
  return value;
}

export async function createTeacher(formData: FormData) {
  await requireAdmin();
  await db.insert(teachers).values(await parseTeacher(formData));
  revalidatePath("/admin/teachers");
}

export async function updateTeacher(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await db.update(teachers).set(await parseTeacher(formData)).where(eq(teachers.id, id));
  revalidatePath("/admin/teachers");
}

export async function setTeacherActive(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("active") === "true";
  await db.update(teachers).set({ isActive }).where(eq(teachers.id, id));
  revalidatePath("/admin/teachers");
}
