import { after } from "next/server";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { chatMessages, chats, profiles } from "@/db/schema";
import { auth } from "@/features/auth/auth";
import { getAccessibleTeacher } from "@/features/chat/access";
import { buildContext } from "@/features/chat/build-context";
import { foldChatIfNeeded } from "@/features/chat/summarize";
import { makeTitle } from "@/features/chat/title";
import { localeFromRequest, parseLocale } from "@/i18n/locales";
import { messagesFor } from "@/i18n/messages";
import { streamGemini } from "@/lib/gemini";

const MAX_TEXT = 4000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (status: number, error: string) => Response.json({ error }, { status });

// The single route to Gemini: session → role access to the teacher → save → streaming → save the answer.
export async function POST(request: Request) {
  const errors = messagesFor(localeFromRequest(request)).errors;
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return fail(401, errors.loginRequired);
  if (!user.role) return fail(403, errors.accessClosed);

  const body = await request.json().catch(() => null);
  const chatId: unknown = body?.chatId;
  const teacherIdInput: unknown = body?.teacherId;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (typeof chatId !== "string" || !UUID.test(chatId)) return fail(400, errors.invalidChatId);
  if (!text || text.length > MAX_TEXT) return fail(400, errors.invalidMessage);

  const [existing] = await db.select().from(chats).where(eq(chats.id, chatId));
  let teacherId: string;
  if (existing) {
    // someone else's or a hidden chat is indistinguishable from a nonexistent one
    if (existing.userId !== user.id || existing.deletedAt) return fail(404, errors.chatNotFound);
    teacherId = existing.teacherId;
  } else {
    if (typeof teacherIdInput !== "string" || !UUID.test(teacherIdInput)) {
      return fail(400, errors.teacherIdRequired);
    }
    teacherId = teacherIdInput;
  }

  const teacher = await getAccessibleTeacher(db, user.role, teacherId);
  if (!teacher) return fail(403, errors.noTeacherAccess);

  if (!existing) {
    await db
      .insert(chats)
      .values({ id: chatId, userId: user.id, teacherId, title: makeTitle(text) })
      .onConflictDoNothing();
    // race on the same chatId: the chat must have been created for this very user
    const [created] = await db.select().from(chats).where(eq(chats.id, chatId));
    if (!created || created.userId !== user.id || created.deletedAt) return fail(404, errors.chatNotFound);
  }
  await db.insert(chatMessages).values({ chatId, role: "user", content: text });

  const [entries, [profile]] = await Promise.all([
    db
      .select({ role: chatMessages.role, content: chatMessages.content })
      .from(chatMessages)
      .where(eq(chatMessages.chatId, chatId))
      .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id)),
    db.select().from(profiles).where(eq(profiles.userId, user.id)),
  ]);
  const context = buildContext({
    teacherPrompt: teacher.prompt,
    profile: profile ?? null,
    entries,
    locale: parseLocale(body?.locale),
  });

  // Folding runs after the answer completes; a failure does not affect the answer (foldChatIfNeeded does not throw).
  after(() => foldChatIfNeeded(db, chatId));

  const stream = createUIMessageStream({
    onError: () => errors.answerFailed,
    execute: async ({ writer }) => {
      const id = crypto.randomUUID();
      let answer = "";
      writer.write({ type: "text-start", id });
      try {
        for await (const delta of streamGemini(context)) {
          answer += delta;
          writer.write({ type: "text-delta", id, delta });
        }
      } finally {
        // stream aborted: keep what we managed to receive
        if (answer) await db.insert(chatMessages).values({ chatId, role: "assistant", content: answer });
      }
      if (!answer) throw new Error("Порожня відповідь Gemini");
      writer.write({ type: "text-end", id });
    },
  });
  return createUIMessageStreamResponse({ stream });
}
