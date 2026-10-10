const REQUIRED = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "ADMIN_EMAIL",
] as const;

export type Env = Record<(typeof REQUIRED)[number], string>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const missing = REQUIRED.filter((name) => !source[name]);
  if (missing.length > 0) {
    throw new Error(`Не задано змінні середовища: ${missing.join(", ")}`);
  }
  return Object.fromEntries(REQUIRED.map((name) => [name, source[name] as string])) as Env;
}

let cached: Env | undefined;

export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
