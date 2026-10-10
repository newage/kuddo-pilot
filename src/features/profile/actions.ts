"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { requireUser } from "@/features/auth/session";
import { parseProfileForm, saveProfile } from "./profile";

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  await saveProfile(db, user.id, parseProfileForm(formData));
  revalidatePath("/profile");
}
