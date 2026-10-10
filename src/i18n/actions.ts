"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, LOCALES } from "./locales";

export async function setLocale(formData: FormData) {
  const value = formData.get("locale");
  const locale = LOCALES.find((l) => l === value);
  if (!locale) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
