import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateContentStream = vi.fn();
const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContentStream, generateContent };
  },
}));
vi.mock("./env", () => ({ env: () => ({ GEMINI_API_KEY: "secret-key", GEMINI_MODEL: "test-model" }) }));

import { generateOnce, streamGemini } from "./gemini";

const chunks = async function* () {
  yield { text: "При", candidates: [{ finishReason: undefined }] };
  yield { text: "віт", candidates: [{ finishReason: "STOP" }], usageMetadata: { totalTokenCount: 5 } };
};

let log: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  log = vi.spyOn(console, "log").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
  generateContentStream.mockReset();
  generateContent.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

const output = () => JSON.stringify([...log.mock.calls, ...error.mock.calls]);
const drain = async (g: AsyncGenerator<string>) => {
  let s = "";
  for await (const d of g) s += d;
  return s;
};

describe("логування Gemini", () => {
  it("development: логує запит і відповідь стріму, без ключа", async () => {
    vi.stubEnv("NODE_ENV", "development");
    generateContentStream.mockResolvedValue(chunks());
    expect(await drain(streamGemini({ system: "sys", turns: [{ role: "user", text: "q" }] }))).toBe("Привіт");
    expect(log).toHaveBeenCalledTimes(2);
    expect(output()).toContain("test-model");
    expect(output()).toContain("Привіт");
    expect(output()).toContain('"status":"ok"');
    expect(output()).not.toContain("secret-key");
  });

  it("development: помилка логується й перекидається", async () => {
    vi.stubEnv("NODE_ENV", "development");
    generateContent.mockRejectedValue(Object.assign(new Error("quota"), { status: 429 }));
    await expect(generateOnce({ system: "s", prompt: "p" })).rejects.toThrow("quota");
    expect(error).toHaveBeenCalledTimes(1);
    expect(output()).toContain("429");
    expect(output()).toContain("quota");
  });

  it("порожня відповідь логується як помилка", async () => {
    vi.stubEnv("NODE_ENV", "development");
    generateContent.mockResolvedValue({ text: " " });
    await expect(generateOnce({ system: "s", prompt: "p" })).rejects.toThrow("порожню");
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("production: нічого не логує", async () => {
    vi.stubEnv("NODE_ENV", "production");
    generateContent.mockResolvedValue({ text: "ok" });
    await generateOnce({ system: "s", prompt: "p" });
    generateContentStream.mockResolvedValue(chunks());
    await drain(streamGemini({ system: "s", turns: [] }));
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
