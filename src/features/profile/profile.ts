import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { profiles } from "@/db/schema";

export type ProfileInput = { name: string; age: number | null; hobbies: string; about: string };

export async function getProfile(db: Db, userId: string) {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  return row ?? { userId, name: "", age: null, hobbies: "", about: "" };
}

// One record per user. The self-description is stored as is, unfiltered.
export async function saveProfile(db: Db, userId: string, input: ProfileInput) {
  await db
    .insert(profiles)
    .values({ userId, ...input })
    .onConflictDoUpdate({ target: profiles.userId, set: input });
}

export function parseProfileForm(formData: FormData): ProfileInput {
  const text = (key: string, max = 2000) => String(formData.get(key) ?? "").trim().slice(0, max);
  const ageRaw = text("age");
  const age = ageRaw === "" ? null : Number.parseInt(ageRaw, 10);
  return {
    name: text("name", 100),
    age: age !== null && Number.isInteger(age) && age >= 0 && age <= 120 ? age : null,
    hobbies: text("hobbies", 500),
    about: text("about"),
  };
}
