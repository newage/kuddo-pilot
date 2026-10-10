import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/test-db";
import { users } from "@/db/schema";
import { ensureUser } from "./users";
import type { Db } from "@/db/client";

let t: Awaited<ReturnType<typeof createTestDb>>;
let db: Db;

beforeAll(async () => {
  t = await createTestDb();
  db = t.db as unknown as Db;
});
beforeEach(() => t.reset());
afterAll(() => t.close());

describe("ensureUser", () => {
  it("перший вхід створює користувача без ролі", async () => {
    const user = await ensureUser(db, { email: "kid@example.com", name: "Kid" }, "admin@example.com");
    expect(user.role).toBeNull();
    expect(user.email).toBe("kid@example.com");
  });

  it("email з ADMIN_EMAIL отримує роль admin", async () => {
    const user = await ensureUser(db, { email: "Admin@Example.com" }, "admin@example.com");
    expect(user.role).toBe("admin");
  });

  it("повторний вхід не дублює запис і зберігає роль", async () => {
    const first = await ensureUser(db, { email: "kid@example.com" }, "admin@example.com");
    await db.update(users).set({ role: "user" });
    const second = await ensureUser(db, { email: "kid@example.com" }, "admin@example.com");
    expect(second.id).toBe(first.id);
    expect(second.role).toBe("user");
    expect(await db.select().from(users)).toHaveLength(1);
  });
});
