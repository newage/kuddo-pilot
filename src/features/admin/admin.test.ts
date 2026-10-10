import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { chats, roleTeachers, teachers, users } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { seedChat } from "@/db/test-fixtures";
import { listAccessibleTeachers } from "@/features/chat/access";

const h = vi.hoisted(() => ({ db: undefined as unknown, session: null as unknown, locale: "uk" as "uk" | "pl" }));

vi.mock("@/db/client", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("@/features/auth/auth", () => ({ auth: async () => h.session }));
vi.mock("@/i18n/server", async () => {
  const { messagesFor } = await import("@/i18n/messages");
  return { getLocale: async () => h.locale, getMessages: async () => messagesFor(h.locale) };
});
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { requireAdmin } from "@/features/auth/session";
import { grantAccess, revokeAccess } from "./access-actions";
import { setUserRole } from "./users-actions";
import { createTeacher, setTeacherActive, updateTeacher } from "@/features/teachers/actions";

let t: Awaited<ReturnType<typeof createTestDb>>;
let db: Db;

beforeAll(async () => {
  t = await createTestDb();
  db = t.db as unknown as Db;
  h.db = db;
});
beforeEach(() => t.reset());
afterAll(() => t.close());

const form = (data: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
};
const asUser = (u: { id: string; role: "admin" | "user" | null; email: string }) => {
  h.session = { user: u };
};

describe("доступ до admin", () => {
  it("user отримує відмову (layout і всі дії)", async () => {
    const { user, teacher } = await seedChat(db, { role: "user" });
    asUser(user);

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/chat");
    await expect(setUserRole(form({ userId: user.id, role: "admin" }))).rejects.toThrow("REDIRECT");
    await expect(createTeacher(form({ name: "a", subject: "b", prompt: "c" }))).rejects.toThrow("REDIRECT");
    await expect(grantAccess(form({ role: "user", teacherId: teacher.id }))).rejects.toThrow("REDIRECT");
    expect((await db.select().from(users).where(eq(users.id, user.id)))[0].role).toBe("user");
  });

  it("неавторизований і без ролі — відмова", async () => {
    h.session = null;
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
    const { user } = await seedChat(db, { role: null });
    asUser(user);
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/waiting");
  });
});

describe("ролі", () => {
  it("admin призначає роль користувачу без ролі", async () => {
    const { user: admin } = await seedChat(db, { role: "admin", email: "a@example.com" });
    const [kid] = await db.insert(users).values({ email: "k@example.com" }).returning();
    asUser(admin);

    await setUserRole(form({ userId: kid.id, role: "user" }));
    expect((await db.select().from(users).where(eq(users.id, kid.id)))[0].role).toBe("user");
  });

  it("некоректну роль і зміну власної ролі відхиляє", async () => {
    const { user: admin } = await seedChat(db, { role: "admin" });
    asUser(admin);
    await expect(setUserRole(form({ userId: admin.id, role: "user" }))).rejects.toThrow("Свою роль змінювати не можна");
    h.locale = "pl";
    await expect(setUserRole(form({ userId: admin.id, role: "user" }))).rejects.toThrow("Nie można zmienić własnej roli");
    h.locale = "uk";
    await expect(setUserRole(form({ userId: admin.id, role: "parent" }))).rejects.toThrow();
  });
});

describe("вчителі й доступи", () => {
  it("створення, редагування, деактивація; неактивний зникає зі списку нових чатів", async () => {
    const { user: admin } = await seedChat(db, { role: "admin" });
    asUser(admin);
    await db.delete(chats);
    await db.delete(teachers);

    await createTeacher(form({ name: "Фізик", subject: "Фізика", prompt: "p1" }));
    const [teacher] = await db.select().from(teachers);
    await updateTeacher(form({ id: teacher.id, name: "Фізик", subject: "Фізика", prompt: "p2" }));
    expect((await db.select().from(teachers))[0].prompt).toBe("p2");

    await grantAccess(form({ role: "user", teacherId: teacher.id }));
    expect(await listAccessibleTeachers(db, "user")).toHaveLength(1);

    await setTeacherActive(form({ id: teacher.id, active: "false" }));
    expect(await listAccessibleTeachers(db, "user")).toHaveLength(0);
  });

  it("порожні поля вчителя відхиляються", async () => {
    const { user: admin } = await seedChat(db, { role: "admin" });
    asUser(admin);
    await expect(createTeacher(form({ name: "", subject: "b", prompt: "c" }))).rejects.toThrow();
  });

  it("доданий вчитель з'являється ролі, відкликаний — зникає", async () => {
    const { user: admin, teacher } = await seedChat(db, { role: "admin" });
    asUser(admin);
    expect(await listAccessibleTeachers(db, "user")).toHaveLength(0);

    await grantAccess(form({ role: "user", teacherId: teacher.id }));
    await grantAccess(form({ role: "user", teacherId: teacher.id })); // ідемпотентно
    expect(await listAccessibleTeachers(db, "user")).toHaveLength(1);
    expect(await db.select().from(roleTeachers)).toHaveLength(1);

    await revokeAccess(form({ role: "user", teacherId: teacher.id }));
    expect(await listAccessibleTeachers(db, "user")).toHaveLength(0);
  });
});
