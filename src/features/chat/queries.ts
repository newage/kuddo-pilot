import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { chatMessages, chats, teachers } from "@/db/schema";

export async function listChats(db: Db, userId: string) {
  return db
    .select({ id: chats.id, title: chats.title, teacherName: teachers.name })
    .from(chats)
    .innerJoin(teachers, eq(teachers.id, chats.teacherId))
    .where(and(eq(chats.userId, userId), isNull(chats.deletedAt)))
    .orderBy(desc(chats.createdAt));
}

// Лише власний і не прихований чат; інакше null.
export async function getChatWithEntries(db: Db, userId: string, chatId: string) {
  const [chat] = await db
    .select({ id: chats.id, title: chats.title, teacherName: teachers.name })
    .from(chats)
    .innerJoin(teachers, eq(teachers.id, chats.teacherId))
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId), isNull(chats.deletedAt)));
  if (!chat) return null;
  const entries = await db
    .select({ id: chatMessages.id, role: chatMessages.role, content: chatMessages.content })
    .from(chatMessages)
    .where(eq(chatMessages.chatId, chatId))
    .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id));
  return { chat, entries };
}

// Soft delete: лише виставляє deleted_at, записи лишаються в БД.
export async function hideChat(db: Db, userId: string, chatId: string) {
  const rows = await db
    .update(chats)
    .set({ deletedAt: new Date() })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId), isNull(chats.deletedAt)))
    .returning({ id: chats.id });
  return rows.length > 0;
}
