# Kuddo Pilot

A chat UI for a child with AI teachers powered by Gemini: Google sign-in, `admin`/`user` roles, role-based access to teachers, chat history with a cumulative summary (≤10 records per chat), a child profile, and a minimal admin portal.

Stack: Next.js (App Router), Auth.js, Drizzle + PostgreSQL, `@google/genai`, Vercel AI SDK, Tailwind + shadcn/ui.

## Running locally (Docker only)

Running without Docker is not supported. All Docker files live in `docker/`.

```bash
cp .env.example .env     # fill in the variables (table below)
docker compose -f docker/compose.yml up
```

Two services start: `app` (Next.js at <http://localhost:3000>) and `db` (Postgres). On start, `app` installs dependencies and applies migrations (`npm run db:migrate`).

## Environment variables

Set in `.env` (template: `.env.example`). `DATABASE_URL` is overridden in `docker/compose.yml` when running in Docker.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Auth.js secret |
| `AUTH_URL` | Base URL for the OAuth redirect (not `0.0.0.0` — Google rejects it). Needed locally; on Vercel it is detected automatically |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth 2.0 client |
| `GEMINI_API_KEY` | Google AI Studio key |
| `GEMINI_MODEL` | Gemini model id (single source of truth) |
| `ADMIN_EMAIL` | Email of the primary admin: gets the `admin` role on sign-in |

## First run

1. Sign in with Google using the email from `ADMIN_EMAIL` — you get the `admin` role.
2. In `/admin/teachers`, create a teacher (name, subject, system prompt).
3. In `/admin/access`, open the teacher to the `user` role (and to `admin` if needed).
4. In `/admin/users`, assign roles to other users — until then they only see "wait until the admin grants access".

## Commands (inside the container)

```bash
docker compose -f docker/compose.yml exec app npm test            # vitest (needs the compose DB)
docker compose -f docker/compose.yml exec app npm run lint
docker compose -f docker/compose.yml exec app npm run db:generate # new migration after changing src/db/schema.ts
```

Tests use a separate `kuddo_test` database in the same Postgres.

## UI languages

`uk` (default) and `pl` are supported. The language comes from the `locale` cookie (explicit choice via the switcher), otherwise from `Accept-Language`.
To add a language: add the code to `LOCALES` (`src/i18n/locales.ts`), create `src/i18n/messages/<code>.ts` typed as `Messages`
(the type forces you to fill in every key), register it in `src/i18n/messages/index.ts`, and add the reply-language line
to `LANGUAGE_INSTRUCTION` (`src/features/chat/build-context.ts`). Teacher names and prompts, profiles, and chats are not translated.

## Deploying to Vercel

Production runs on Vercel + a managed Postgres (Neon / Vercel Postgres). The environment variables are the same as above.

1. **Create a database.** In the Vercel dashboard, open *Storage* and create a Neon Postgres (or create a Neon project directly). Note two connection strings: the **pooled** one (for the app) and the **unpooled / direct** one (for migrations).
2. **Import the project.** *Add New… → Project*, pick the Git repository. The framework is detected as Next.js; keep the default build settings. Node.js version must be ≥ 24 (*Settings → General → Node.js Version*).
3. **Set environment variables** (*Settings → Environment Variables*, for Production, and Preview if you use it):
   - `DATABASE_URL` — the pooled connection string;
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`;
   - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` — see step 4;
   - `GEMINI_API_KEY`, `GEMINI_MODEL`;
   - `ADMIN_EMAIL` — the email of the first admin.

   `AUTH_URL` is not required on Vercel (the host is trusted automatically); set it only if you use a custom domain and sign-in redirects go to the wrong host.
4. **Configure Google OAuth.** In Google Cloud Console → *APIs & Services → Credentials*, use (or create) an *OAuth client ID* of type *Web application* and add:
   - Authorized JavaScript origin: `https://<your-domain>`;
   - Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`.

   Copy the client id and secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`. If the OAuth consent screen is in *Testing* mode, add the users' emails as test users or publish the app.
5. **Apply migrations.** Vercel does not run them automatically. From your machine, with the **unpooled** connection string:

   ```bash
   DATABASE_URL="<unpooled connection string>" npm run db:migrate
   ```

   Repeat after every `npm run db:generate` that adds a migration, before (or together with) deploying the code that needs it.
6. **Deploy.** Click *Deploy* (or push to the production branch). Every later push redeploys.
7. **Check.** Open the deployment URL, sign in with the `ADMIN_EMAIL` account, and follow *First run* above to create teachers and grant access.

If the Google sign-in fails with `redirect_uri_mismatch`, the redirect URI in step 4 does not exactly match the URL you are opening (scheme, domain, path). If chat requests are cut off on long answers, raise the function's max duration in the Vercel project settings.
