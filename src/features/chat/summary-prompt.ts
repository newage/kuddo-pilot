// A single summarization prompt for all teachers: independent of the subject and free of the teacher prompt or profile.
export const SUMMARY_SYSTEM_PROMPT = [
  "Ти стискаєш історію розмови в короткий підсумок.",
  "Збережи ключові факти, теми, висновки й нерозв'язані питання.",
  "Якщо є попередній підсумок, включи його зміст у новий.",
  "Пиши тією ж мовою, якою написана розмова (якщо мови змішані — мовою останніх повідомлень дитини), лише текст підсумку, без вступів.",
].join(" ");

export type SummaryEntry = { role: "user" | "assistant" | "summary"; content: string };

const LABEL = { user: "Дитина", assistant: "Вчитель" } as const;

export function buildSummaryInput(entries: SummaryEntry[]): string {
  return entries
    .map((e) =>
      e.role === "summary" ? `Попередній підсумок: ${e.content}` : `${LABEL[e.role]}: ${e.content}`,
    )
    .join("\n");
}
