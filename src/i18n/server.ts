import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./locales";
import { messagesFor } from "./messages";

export async function getLocale(): Promise<Locale> {
  const [jar, h] = await Promise.all([cookies(), headers()]);
  return resolveLocale(jar.get(LOCALE_COOKIE)?.value, h.get("accept-language"));
}

export async function getMessages() {
  return messagesFor(await getLocale());
}
