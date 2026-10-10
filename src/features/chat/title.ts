const TITLE_MAX = 60;

// Назва чату — обрізане перше повідомлення, без звернення до Gemini.
export function makeTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > TITLE_MAX ? `${t.slice(0, TITLE_MAX).trimEnd()}…` : t;
}
