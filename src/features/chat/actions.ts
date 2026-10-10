"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { requireUser } from "@/features/auth/session";
import { hideChat } from "./queries";

export async function deleteChat(formData: FormData) {
  const user = await requireUser();
  const chatId = String(formData.get("chatId") ?? "");
  await hideChat(db, user.id, chatId);
  revalidatePath("/chat", "layout");
  redirect("/chat");
}
