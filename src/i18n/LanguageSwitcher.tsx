import { LOCALES } from "./locales";
import { setLocale } from "./actions";
import { getLocale, getMessages } from "./server";

export async function LanguageSwitcher() {
  const [current, m] = await Promise.all([getLocale(), getMessages()]);
  return (
    <form action={setLocale} className="flex gap-1 text-sm" aria-label={m.languageSwitcher.label}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="submit"
          name="locale"
          value={l}
          aria-current={l === current ? "true" : undefined}
          className={l === current ? "rounded px-2 py-1 font-semibold underline" : "rounded px-2 py-1 text-muted-foreground"}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </form>
  );
}
