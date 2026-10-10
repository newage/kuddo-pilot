import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { roleTeachers, teachers, type Role } from "@/db/schema";

// Доступ ролі до активного вчителя: перевіряється на кожен запит до чату.
export async function getAccessibleTeacher(db: Db, role: Role, teacherId: string) {
  const [row] = await db
    .select({ teacher: teachers })
    .from(teachers)
    .innerJoin(roleTeachers, eq(roleTeachers.teacherId, teachers.id))
    .where(and(eq(teachers.id, teacherId), eq(teachers.isActive, true), eq(roleTeachers.role, role)));
  return row?.teacher ?? null;
}

export async function listAccessibleTeachers(db: Db, role: Role) {
  const rows = await db
    .select({ teacher: teachers })
    .from(teachers)
    .innerJoin(roleTeachers, eq(roleTeachers.teacherId, teachers.id))
    .where(and(eq(teachers.isActive, true), eq(roleTeachers.role, role)));
  return rows.map((r) => r.teacher);
}
