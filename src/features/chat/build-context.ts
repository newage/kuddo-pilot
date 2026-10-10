import type { Locale } from "@/i18n/locales";
import type { GeminiTurn } from "@/lib/gemini";

export type ContextEntry = { role: "user" | "assistant" | "summary"; content: string };
export type ContextProfile = { name: string; age: number | null; hobbies: string; about: string };

const LANGUAGE_INSTRUCTION: Record<Locale, string> = {
  uk: "Відповідай українською мовою.",
  pl: "Odpowiadaj w języku polskim.",
};

function profileBlock(p: ContextProfile | null): string {
  if (!p) return "";
  const lines = [
    p.name && `Ім'я: ${p.name}`,
    p.age !== null && `Вік: ${p.age}`,
    p.hobbies && `Хобі: ${p.hobbies}`,
    p.about && `Про себе: ${p.about}`,
  ].filter(Boolean);
  return lines.length ? `\n\nПрофіль дитини:\n${lines.join("\n")}` : "";
}

// Контекст запиту: актуальний промпт вчителя + профіль (лише тут, не в БД) і записи чату, підсумок першим.
export function buildContext(input: {
  teacherPrompt: string;
  profile: ContextProfile | null;
  entries: ContextEntry[];
  locale: Locale;
}): { system: string; turns: GeminiTurn[] } {
  const turns: GeminiTurn[] = [];
  for (const e of input.entries) {
    const turn: GeminiTurn =
      e.role === "summary"
        ? { role: "user", text: `Підсумок попередньої розмови: ${e.content}` }
        : { role: e.role === "user" ? "user" : "model", text: e.content };
    const last = turns[turns.length - 1];
    if (last && last.role === turn.role) last.text += `\n\n${turn.text}`;
    else turns.push(turn);
  }
  // інструкція мови йде останньою: промпт вчителя може бути іншою мовою
  const system = `${input.teacherPrompt}${profileBlock(input.profile)}\n\n${LANGUAGE_INSTRUCTION[input.locale]}`;
  return { system, turns };
}
