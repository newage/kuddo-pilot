import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { chatMessages, chats, profiles, roleTeachers, users } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { addEntries, seedChat } from "@/db/test-fixtures";

const h = vi.hoisted(() => ({
  db: undefined as unknown,
  session: null as unknown,
  afterCallbacks: [] as Array<() => unknown>,
  geminiCalls: [] as Array<{ system: string; turns: Array<{ role: string; text: string }> }>,
  geminiImpl: null as null | (() => AsyncGenerator<string>),
  summaryFails: false,
}));

vi.mock("@/db/client", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("@/features/auth/auth", () => ({ auth: async () => h.session }));
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (fn: () => unknown) => h.afterCallbacks.push(fn),
}));
vi.mock("@/lib/gemini", () => ({
  streamGemini: (input: { system: string; turns: Array<{ role: string; text: string }> }) => {
    h.geminiCalls.push(input);
    return h.geminiImpl ? h.geminiImpl() : (async function* () { yield "Від"; yield "повідь"; })();
  },
  generateOnce: async () => {
    if (h.summaryFails) throw new Error("gemini down");
    return "підсумок";
  },
}));

import { POST } from "@/app/api/chat/route";

let t: Awaited<ReturnType<typeof createTestDb>>;
let db: Db;

beforeAll(async () => {
  t = await createTestDb();
  db = t.db as unknown as Db;
  h.db = db;
});
beforeEach(async () => {
  await t.reset();
  h.session = null;
  h.afterCallbacks = [];
  h.geminiCalls = [];
  h.geminiImpl = null;
  h.summaryFails = false;
});
afterAll(() => t.close());

const CHAT_ID = "11111111-1111-4111-8111-111111111111";

function post(body: unknown) {
  return POST(
    new Request("http://x/api/chat", { method: "POST", body: JSON.stringify(body) }),
  );
}

async function setup(opts: { grant?: boolean; role?: "admin" | "user" | null; keepChat?: boolean } = {}) {
  const seeded = await seedChat(db, { role: opts.role });
  if (opts.keepChat === false) await db.delete(chats);
  if (opts.grant !== false) {
    await db.insert(roleTeachers).values({ role: "user", teacherId: seeded.teacher.id });
  }
  h.session = {
    user: { id: seeded.user.id, role: seeded.user.role, email: seeded.user.email },
  };
  return seeded;
}

const entries = (chatId: string) =>
  db.select().from(chatMessages).where(eq(chatMessages.chatId, chatId)).orderBy(asc(chatMessages.createdAt));

describe("POST /api/chat", () => {
  it("без сесії → 401", async () => {
    const res = await post({ chatId: CHAT_ID, text: "hi" });
    expect(res.status).toBe(401);
  });

  it("без ролі → 403", async () => {
    const { teacher } = await setup({ role: null, keepChat: false });
    const res = await post({ chatId: CHAT_ID, teacherId: teacher.id, text: "hi" });
    expect(res.status).toBe(403);
  });

  it("роль без доступу до вчителя → 403", async () => {
    const { teacher } = await setup({ grant: false, keepChat: false });
    const res = await post({ chatId: CHAT_ID, teacherId: teacher.id, text: "hi" });
    expect(res.status).toBe(403);
    expect(await db.select().from(chats)).toHaveLength(0);
  });

  it("неактивний вчитель → відмова", async () => {
    const { teacher, chat } = await setup();
    await db.update((await import("@/db/schema")).teachers).set({ isActive: false });
    const res = await post({ chatId: chat.id, text: "hi" });
    expect(res.status).toBe(403);
    expect(await entries(chat.id)).toHaveLength(0);
    expect(teacher.id).toBeTruthy();
  });

  it("чужий чат → відмова", async () => {
    const { chat } = await setup();
    const [other] = await db.insert(users).values({ email: "o@example.com", role: "user" }).returning();
    h.session = { user: { id: other.id, role: "user", email: other.email } };
    const res = await post({ chatId: chat.id, text: "hi" });
    expect(res.status).toBe(404);
    expect(await entries(chat.id)).toHaveLength(0);
  });

  it("прихований чат → відмова", async () => {
    const { chat } = await setup();
    await db.update(chats).set({ deletedAt: new Date() }).where(eq(chats.id, chat.id));
    const res = await post({ chatId: chat.id, text: "hi" });
    expect(res.status).toBe(404);
    expect(await entries(chat.id)).toHaveLength(0);
  });

  it("новий чат: створюється, назва — обрізане перше повідомлення, відповідь зберігається", async () => {
    const { teacher, user } = await setup({ keepChat: false });
    const long = "а".repeat(200);
    const res = await post({ chatId: CHAT_ID, teacherId: teacher.id, text: long });
    expect(res.status).toBe(200);
    await res.text();

    const [chat] = await db.select().from(chats);
    expect(chat).toMatchObject({ id: CHAT_ID, userId: user.id, teacherId: teacher.id });
    expect(chat.title.length).toBeLessThan(long.length);
    expect(long.startsWith(chat.title.replace("…", ""))).toBe(true);

    const rows = await entries(CHAT_ID);
    expect(rows.map((r) => r.role)).toEqual(["user", "assistant"]);
    expect(rows[1].content).toBe("Відповідь");
  });

  it("запис чату не містить промпту вчителя й профілю, а запит до Gemini — містить", async () => {
    const { teacher, user } = await setup({ keepChat: false });
    await db.insert(profiles).values({ userId: user.id, name: "Оля", about: "СЕКРЕТНИЙ САМООПИС" });
    const res = await post({ chatId: CHAT_ID, teacherId: teacher.id, text: "Привіт" });
    await res.text();

    const stored = (await entries(CHAT_ID)).map((r) => r.content).join("\n");
    expect(stored).not.toContain("СЕКРЕТНИЙ ПРОМПТ ВЧИТЕЛЯ");
    expect(stored).not.toContain("СЕКРЕТНИЙ САМООПИС");
    expect(h.geminiCalls[0].system).toContain("СЕКРЕТНИЙ ПРОМПТ ВЧИТЕЛЯ");
    expect(h.geminiCalls[0].system).toContain("СЕКРЕТНИЙ САМООПИС");
  });

  it("locale=pl → інструкція польською в кінці system; невалідна → українською", async () => {
    const { teacher } = await setup({ keepChat: false });
    await (await post({ chatId: CHAT_ID, teacherId: teacher.id, text: "Cześć", locale: "pl" })).text();
    expect(h.geminiCalls[0].system.endsWith("Odpowiadaj w języku polskim.")).toBe(true);

    const second = "22222222-2222-4222-8222-222222222222";
    await (await post({ chatId: second, teacherId: teacher.id, text: "Hi", locale: "de" })).text();
    expect(h.geminiCalls[1].system.endsWith("Відповідай українською мовою.")).toBe(true);
  });

  it("помилка мовою користувача (cookie / Accept-Language)", async () => {
    const withHeaders = (headers: Record<string, string>) =>
      POST(new Request("http://x/api/chat", { method: "POST", headers, body: "{}" }));
    expect((await (await withHeaders({ cookie: "locale=pl" })).json()).error).toBe("Wymagane logowanie");
    expect((await (await withHeaders({ "accept-language": "pl-PL" })).json()).error).toBe("Wymagane logowanie");
    expect((await (await withHeaders({})).json()).error).toBe("Потрібен вхід");
  });

  it("зміна промпту вчителя діє на наявний чат", async () => {
    const { chat, teacher } = await setup();
    await db.update((await import("@/db/schema")).teachers).set({ prompt: "НОВИЙ ПРОМПТ" });
    const res = await post({ chatId: chat.id, text: "hi" });
    await res.text();
    expect(h.geminiCalls[0].system).toContain("НОВИЙ ПРОМПТ");
    expect(teacher.id).toBeTruthy();
  });

  it("згортання реєструється в after() і не виконується до завершення відповіді", async () => {
    const { chat } = await setup();
    await addEntries(db, chat.id, 9);
    const res = await post({ chatId: chat.id, text: "десяте" });
    await res.text();

    // відповідь уже збережена (11 записів), згортання ще не виконано
    expect(h.afterCallbacks).toHaveLength(1);
    expect(await entries(chat.id)).toHaveLength(11);

    await h.afterCallbacks[0]();
    const rows = await entries(chat.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].role).toBe("summary");
  });

  it("збій згортання не ламає відповідь і не змінює записи", async () => {
    const { chat } = await setup();
    await addEntries(db, chat.id, 9);
    vi.spyOn(console, "error").mockImplementation(() => {});
    h.summaryFails = true;

    const res = await post({ chatId: chat.id, text: "десяте" });
    expect(res.status).toBe(200);
    await res.text();
    await expect(Promise.resolve(h.afterCallbacks[0]())).resolves.toEqual({ folded: false });
    expect(await entries(chat.id)).toHaveLength(11);
  });

  it("обрив стріму: уже отримана частина зберігається, користувацьке повідомлення теж", async () => {
    const { teacher } = await setup({ keepChat: false });
    h.geminiImpl = async function* () {
      yield "частина";
      throw new Error("обрив");
    };
    const res = await post({ chatId: CHAT_ID, teacherId: teacher.id, text: "hi" });
    await res.text();
    const rows = await entries(CHAT_ID);
    expect(rows.map((r) => [r.role, r.content])).toEqual([
      ["user", "hi"],
      ["assistant", "частина"],
    ]);
  });

  it("порожнє повідомлення → 400", async () => {
    const { teacher } = await setup({ keepChat: false });
    expect((await post({ chatId: CHAT_ID, teacherId: teacher.id, text: "  " })).status).toBe(400);
  });
});
