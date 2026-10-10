import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { chatMessages } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { addEntries, seedChat } from "@/db/test-fixtures";
import { foldChatIfNeeded } from "./summarize";

let t: Awaited<ReturnType<typeof createTestDb>>;
let db: Db;

beforeAll(async () => {
  t = await createTestDb();
  db = t.db as unknown as Db;
});
beforeEach(() => t.reset());
afterAll(() => t.close());

const entries = (chatId: string) =>
  db.select().from(chatMessages).where(eq(chatMessages.chatId, chatId)).orderBy(asc(chatMessages.createdAt));

describe("foldChatIfNeeded", () => {
  it("10 записів → один summary першим", async () => {
    const { chat } = await seedChat(db);
    await addEntries(db, chat.id, 10);
    const generate = vi.fn().mockResolvedValue("підсумок");

    expect(await foldChatIfNeeded(db, chat.id, generate)).toEqual({ folded: true });

    const rows = await entries(chat.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ role: "summary", content: "підсумок" });
  });

  it("9 записів не згортаються", async () => {
    const { chat } = await seedChat(db);
    await addEntries(db, chat.id, 9);
    const generate = vi.fn();

    expect(await foldChatIfNeeded(db, chat.id, generate)).toEqual({ folded: false });
    expect(generate).not.toHaveBeenCalled();
    expect(await entries(chat.id)).toHaveLength(9);
  });

  it("порожній чат не згортається", async () => {
    const { chat } = await seedChat(db);
    expect(await foldChatIfNeeded(db, chat.id, vi.fn())).toEqual({ folded: false });
  });

  it("попередній підсумок входить у новий, підсумок лишається першим", async () => {
    const { chat } = await seedChat(db);
    await addEntries(db, chat.id, 10);
    await foldChatIfNeeded(db, chat.id, async () => "перший підсумок");
    await addEntries(db, chat.id, 9, 10);

    const generate = vi.fn().mockResolvedValue("другий підсумок");
    await foldChatIfNeeded(db, chat.id, generate);

    expect(generate.mock.calls[0][0].prompt).toContain("перший підсумок");
    const rows = await entries(chat.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ role: "summary", content: "другий підсумок" });
  });

  it("збій Gemini → записи не змінені, помилка не кидається", async () => {
    const { chat } = await seedChat(db);
    await addEntries(db, chat.id, 10);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await foldChatIfNeeded(db, chat.id, async () => {
      throw new Error("gemini down");
    });

    expect(result).toEqual({ folded: false });
    expect(await entries(chat.id)).toHaveLength(10);
  });

  it("чат з 11 записів згортається (повтор після збою)", async () => {
    const { chat } = await seedChat(db);
    await addEntries(db, chat.id, 11);
    await foldChatIfNeeded(db, chat.id, async () => "підсумок");
    const rows = await entries(chat.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].role).toBe("summary");
  });

  it("паралельні згортання → один підсумок", async () => {
    const { chat } = await seedChat(db);
    await addEntries(db, chat.id, 10);
    const generate = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 100));
      return "підсумок";
    });

    const results = await Promise.all([
      foldChatIfNeeded(db, chat.id, generate),
      foldChatIfNeeded(db, chat.id, generate),
    ]);

    expect(results.filter((r) => r.folded)).toHaveLength(1);
    expect(generate).toHaveBeenCalledTimes(1);
    const rows = await entries(chat.id);
    expect(rows.filter((r) => r.role === "summary")).toHaveLength(1);
    expect(rows).toHaveLength(1);
  });
});
