import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { profiles } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { seedChat } from "@/db/test-fixtures";
import { getProfile, parseProfileForm, saveProfile } from "./profile";

let t: Awaited<ReturnType<typeof createTestDb>>;
let db: Db;

beforeAll(async () => {
  t = await createTestDb();
  db = t.db as unknown as Db;
});
beforeEach(() => t.reset());
afterAll(() => t.close());

describe("profile", () => {
  it("значення зберігаються й читаються наступного разу, один запис на користувача", async () => {
    const { user } = await seedChat(db);
    await saveProfile(db, user.id, { name: "Оля", age: 9, hobbies: "малювання", about: "<b>люблю</b> котів" });
    await saveProfile(db, user.id, { name: "Оля", age: 10, hobbies: "танці", about: "<b>люблю</b> котів" });

    expect(await getProfile(db, user.id)).toMatchObject({ name: "Оля", age: 10, hobbies: "танці", about: "<b>люблю</b> котів" });
    expect(await db.select().from(profiles)).toHaveLength(1);
  });

  it("порожній профіль за замовчуванням", async () => {
    const { user } = await seedChat(db);
    expect(await getProfile(db, user.id)).toMatchObject({ name: "", age: null });
  });

  it("parseProfileForm відкидає некоректний вік", () => {
    const f = (age: string) => {
      const fd = new FormData();
      fd.set("age", age);
      return parseProfileForm(fd).age;
    };
    expect(f("9")).toBe(9);
    expect(f("")).toBeNull();
    expect(f("abc")).toBeNull();
    expect(f("500")).toBeNull();
  });
});
