export const LOCALES = ["uk", "pl"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "uk";
export const LOCALE_COOKIE = "locale";

export function parseLocale(value: unknown): Locale {
  return LOCALES.find((l) => l === value) ?? DEFAULT_LOCALE;
}

function isLocale(value: unknown): value is Locale {
  return LOCALES.some((l) => l === value);
}

// Перша підтримувана мова за пріоритетом q (q=0 ігноруємо); інакше мова за замовчуванням.
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { base: tag.trim().split("-")[0].toLowerCase(), weight, index };
    })
    .filter((x) => x.base && Number.isFinite(x.weight) && x.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  return ranked.find((x) => isLocale(x.base))?.base as Locale | undefined ?? DEFAULT_LOCALE;
}

// Явний вибір (cookie) сильніший за Accept-Language; невалідна cookie ігнорується.
export function resolveLocale(cookieValue: string | null | undefined, acceptLanguage: string | null | undefined): Locale {
  return isLocale(cookieValue) ? cookieValue : negotiateLocale(acceptLanguage);
}

export function localeFromRequest(request: Request): Locale {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim().split("="))
    .find(([name]) => name === LOCALE_COOKIE)?.[1];
  return resolveLocale(cookie, request.headers.get("accept-language"));
}
