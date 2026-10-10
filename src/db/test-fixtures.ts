import type { Db } from "./client";
import { chatMessages, chats, teachers, users } from "./schema";

export async function seedChat(db: Db, opts: { role?: "admin" | "user" | null; email?: string } = {}) {
  const [user] = await db
    .insert(users)
    .values({ email: opts.email ?? "kid@example.com", role: opts.role === undefined ? "user" : opts.role })
    .returning();
  const [teacher] = await db
    .insert(teachers)
    .values({ name: "Математик", subject: "Математика", prompt: "СЕКРЕТНИЙ ПРОМПТ ВЧИТЕЛЯ" })
    .returning();
  const [chat] = await db
    .insert(chats)
    .values({ userId: user.id, teacherId: teacher.id, title: "Тест" })
    .returning();
  return { user, teacher, chat };
}

// Adds n chat entries with increasing timestamps, alternating user/assistant.
export async function addEntries(db: Db, chatId: string, n: number, startAt = 0) {
  const base = Date.parse("2026-01-01T00:00:00Z");
  for (let i = startAt; i < startAt + n; i++) {
    await db.insert(chatMessages).values({
      chatId,
      role: i % 2 === 0 ? "user" : "assistant",
      content: `запис ${i}`,
      createdAt: new Date(base + i * 1000),
    });
  }
}
