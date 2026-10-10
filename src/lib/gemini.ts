import { GoogleGenAI } from "@google/genai";
import { env } from "./env";

export type GeminiTurn = { role: "user" | "model"; text: string };

let client: GoogleGenAI | undefined;
function ai() {
  client ??= new GoogleGenAI({ apiKey: env().GEMINI_API_KEY });
  return client;
}

// Логи лише в development: промпти містять дані дитини. Ключ не логується.
const logging = () => process.env.NODE_ENV === "development";

function logGemini(label: string, payload: unknown, error = false) {
  if (!logging()) return;
  (error ? console.error : console.log)(`[gemini] ${label}`, payload);
}

function errorDetails(e: unknown) {
  const err = e as { status?: unknown; code?: unknown; message?: unknown };
  return { code: err?.status ?? err?.code, message: err?.message ?? String(e) };
}

// Єдиний вхід до Gemini: id моделі лише з GEMINI_MODEL.
export async function* streamGemini(input: {
  system: string;
  turns: GeminiTurn[];
}): AsyncGenerator<string> {
  const model = env().GEMINI_MODEL;
  const started = Date.now();
  logGemini("stream → запит", { model, system: input.system, turns: input.turns });
  let answer = "";
  let last: { finishReason?: unknown; usage?: unknown } = {};
  try {
    const stream = await ai().models.generateContentStream({
      model,
      contents: input.turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
      config: { systemInstruction: input.system },
    });
    for await (const chunk of stream) {
      last = { finishReason: chunk.candidates?.[0]?.finishReason ?? last.finishReason, usage: chunk.usageMetadata ?? last.usage };
      if (chunk.text) {
        answer += chunk.text;
        yield chunk.text;
      }
    }
    logGemini("stream ← відповідь", { status: "ok", ms: Date.now() - started, ...last, text: answer });
  } catch (e) {
    logGemini("stream ← помилка", { status: "error", ms: Date.now() - started, ...errorDetails(e), partialText: answer }, true);
    throw e;
  }
}

export async function generateOnce(input: { system: string; prompt: string }): Promise<string> {
  const model = env().GEMINI_MODEL;
  const started = Date.now();
  logGemini("generate → запит", { model, system: input.system, prompt: input.prompt });
  try {
    const res = await ai().models.generateContent({
      model,
      contents: input.prompt,
      config: { systemInstruction: input.system },
    });
    const text = res.text?.trim();
    if (!text) throw new Error("Gemini повернув порожню відповідь");
    logGemini("generate ← відповідь", {
      status: "ok",
      ms: Date.now() - started,
      finishReason: res.candidates?.[0]?.finishReason,
      usage: res.usageMetadata,
      text,
    });
    return text;
  } catch (e) {
    logGemini("generate ← помилка", { status: "error", ms: Date.now() - started, ...errorDetails(e) }, true);
    throw e;
  }
}
