import { describe, expect, it } from "vitest";
import { localeFromRequest, negotiateLocale, parseLocale, resolveLocale } from "./locales";

describe("parseLocale", () => {
  it("валідні значення проходять, решта → uk", () => {
    expect(parseLocale("pl")).toBe("pl");
    expect(parseLocale("uk")).toBe("uk");
    expect(parseLocale("de")).toBe("uk");
    expect(parseLocale(undefined)).toBe("uk");
    expect(parseLocale(42)).toBe("uk");
  });
});

describe("negotiateLocale", () => {
  it.each([
    ["pl-PL,pl;q=0.9", "pl"],
    ["en-US,pl;q=0.5", "pl"],
    ["de", "uk"],
    ["uk,pl", "uk"],
    ["pl;q=0.3,uk;q=0.8", "uk"],
    ["pl;q=0", "uk"],
    ["", "uk"],
  ])("%s → %s", (header, expected) => {
    expect(negotiateLocale(header)).toBe(expected);
  });
  it("відсутній заголовок → uk", () => {
    expect(negotiateLocale(null)).toBe("uk");
    expect(negotiateLocale(undefined)).toBe("uk");
  });
});

describe("resolveLocale", () => {
  it("cookie сильніша за Accept-Language", () => {
    expect(resolveLocale("uk", "pl")).toBe("uk");
    expect(resolveLocale("pl", "uk")).toBe("pl");
  });
  it("без cookie або з невалідною — Accept-Language", () => {
    expect(resolveLocale(undefined, "pl")).toBe("pl");
    expect(resolveLocale("xx", "pl-PL")).toBe("pl");
  });
});

describe("localeFromRequest", () => {
  it("читає cookie й заголовок із запиту", () => {
    const req = (headers: Record<string, string>) => new Request("http://x", { headers });
    expect(localeFromRequest(req({ cookie: "a=1; locale=pl", "accept-language": "uk" }))).toBe("pl");
    expect(localeFromRequest(req({ "accept-language": "pl" }))).toBe("pl");
    expect(localeFromRequest(req({}))).toBe("uk");
  });
});
