import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const full = {
  DATABASE_URL: "postgres://x",
  AUTH_SECRET: "s",
  AUTH_GOOGLE_ID: "id",
  AUTH_GOOGLE_SECRET: "secret",
  GEMINI_API_KEY: "k",
  GEMINI_MODEL: "m",
  ADMIN_EMAIL: "a@example.com",
};

describe("parseEnv", () => {
  it("повертає значення, коли все задано", () => {
    expect(parseEnv(full).GEMINI_MODEL).toBe("m");
  });

  it.each(Object.keys(full))("падає, коли відсутня %s", (name) => {
    const source: Record<string, string | undefined> = { ...full };
    delete source[name];
    expect(() => parseEnv(source)).toThrow(name);
  });
});
