import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { chatMessages, users } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { addEntries, seedChat } from "@/db/test-fixtures";
import { getChatWithEntries, hideChat, listChats } from "./queries";

let t: Awaited<ReturnType<typeof createTestDb>>;
let db: Db;

beforeAll(async () => {
  t = await createTestDb();
  db = t.db as unknown as Db;
});
beforeEach(() => t.reset());
afterAll(() => t.close());

describe("hideChat", () => {
  it("лише ховає чат: у списку немає, записи лишаються", async () => {
    const { user, chat } = await seedChat(db);
    await addEntries(db, chat.id, 3);

    expect(await hideChat(db, user.id, chat.id)).toBe(true);

    expect(await listChats(db, user.id)).toHaveLength(0);
    expect(await getChatWithEntries(db, user.id, chat.id)).toBeNull();
    const rows = await db.select().from(chatMessages).where(eq(chatMessages.chatId, chat.id));
    expect(rows).toHaveLength(3);
  });

  it("чужий чат не ховається й не читається", async () => {
    const { chat } = await seedChat(db);
    const [other] = await db.insert(users).values({ email: "o@example.com", role: "user" }).returning();

    expect(await hideChat(db, other.id, chat.id)).toBe(false);
    expect(await getChatWithEntries(db, other.id, chat.id)).toBeNull();
    expect(await listChats(db, other.id)).toHaveLength(0);
  });

  it("підсумок відображається першим серед записів", async () => {
    const { user, chat } = await seedChat(db);
    await addEntries(db, chat.id, 2, 5);
    await db.insert(chatMessages).values({
      chatId: chat.id,
      role: "summary",
      content: "S",
      createdAt: new Date("2025-01-01"),
    });
    const res = await getChatWithEntries(db, user.id, chat.id);
    expect(res?.entries[0].role).toBe("summary");
  });
});
