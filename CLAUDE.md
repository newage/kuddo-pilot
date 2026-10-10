# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Two things in one repo:

1. **Kuddo Pilot** — a Next.js (App Router) chat UI for a child with AI teachers on Gemini: Google sign-in via Auth.js, roles `admin`/`user`, role-based access to teachers, chat history with a rolling summary (≤10 records per chat), child profile, minimal admin portal. See `README.md` for env vars and first run; top-level spec in `.agents/docs/prepare.md`, decision log in `.agents/docs/decisions-chat-ui.md`.
2. **A library of tool-agnostic AI agent skills** (MIT) under `.agents/skills/` — Markdown definitions plus a couple of templates. Skills are also used to develop the app (OpenSpec workflow).

Skill and spec content is written in **Ukrainian** (trigger phrases mix Ukrainian and English). Keep edits in Ukrainian and match the existing terse, rule-heavy style. Skill/Markdown changes are verified by reading them; changes in `src/` are verified by tests and lint.

## App: commands and architecture

Running without Docker is not supported. All Docker files are in `docker/` (`docker/Makefile`: `up`, `down`, `reload`, `console`):

```bash
docker compose -f docker/compose.yml up                              # app on :3000 + Postgres; migrations applied on start
docker compose -f docker/compose.yml exec app npm test               # vitest (needs the compose DB; separate DB `kuddo_test`)
docker compose -f docker/compose.yml exec app npm test -- path/to/file.test.ts   # single test file
docker compose -f docker/compose.yml exec app npm run lint
docker compose -f docker/compose.yml exec app npm run db:generate    # new migration after editing src/db/schema.ts
```

Tests run serially (`fileParallelism: false`) because they share one test DB.

Layout of `src/`:
- `app/` — routes: `chat/`, `admin/{users,teachers,access}`, `profile/`, `login/`, `waiting/`, `api/chat` (streaming), `api/auth`.
- `features/<area>/` — domain logic with co-located `*.test.ts`: `auth`, `admin`, `chat` (access, context building, summarization, title), `profile`, `teachers`. Server actions live in `actions.ts` files.
- `db/` — Drizzle schema (`schema.ts`), client, migrations (generated, don't hand-edit), test DB helpers.
- `i18n/` — `uk` (default) and `pl`. A new UI string must be added to **both** `messages/uk.ts` and `messages/pl.ts` (the `Messages` type enforces it); adding a language is described in `README.md`.
- `lib/` — `env.ts` (validated env), `gemini.ts` (Gemini client; console logging in dev only).
- `middleware.ts` — authentication only (edge, no DB); role checks happen server-side in `requireUser`/`requireAdmin`.

Behavior changes to the app go through OpenSpec: current behavior is in `openspec/specs/<capability>/spec.md`, changes in `openspec/changes/` (archived when done). Use `/opsx:explore` → `/opsx:propose` → `/opsx:apply` → `/opsx:archive`; slash commands are in `.claude/commands/opsx/`.

## Skill layout

Claude Code auto-discovers skills from `.claude/skills/`, not `.agents/skills/`. In this repo `.claude/skills/` holds only the `openspec-*` skills (duplicated in `.agents/skills/`; `.agents/skills/.openspec-target` marks the target). `design-funnel`, `task-breakdown`, `task-orchestration` and `code-review` are meant to be copied/linked into target projects and are not active here unless symlinked.

Each skill is a directory with a `SKILL.md` whose YAML frontmatter (`name`, `description`, `version`) is what the agent sees before loading it. The `description` carries the triggering logic — when to fire, trigger phrases, and explicit "НЕ використовуй для …" exclusions pointing to sibling skills. Bump `version` (semver) when changing a skill's behavior.

Supporting files are referenced by relative links from `SKILL.md` and loaded on demand (`references/`, `modes/`, `adapters/`). Keep `SKILL.md` as the core protocol and push detail into those files.

## How the skills fit together

They form a pipeline with deliberately non-overlapping scopes; each skill's description routes to the others, so changing one skill's scope usually means updating the exclusions in its siblings:

- `design-funnel` — guided design from problem → concept → direction → details, one question at a time. Two modes detected via `ls openspec/config.yaml`: with OpenSpec it sits between `/opsx:explore` and `/opsx:propose`; without, it produces a decision log as a spec. Its name and the absence of a slash command are intentional (the `openspec update` CLI overwrites `openspec-*` skills and `opsx-*` commands) — don't rename it.
- `task-breakdown` — writes or reviews `tasks.md` with explicit change boundaries ("Межі зміни") to prevent scope bloat.
- `task-orchestration` — protocol for delegating to subagents (complexity tiers 1–3, DoD per brief, waves, verification by the orchestrator). Tool-agnostic core in `SKILL.md`; per-mode rules in `modes/` (implementation, code-review, investigation, architecture); tool-specific mechanics in `adapters/` (currently `claude-code.md`, which documents `Agent`/`Monitor`/`SendMessage` usage and model aliases — keep it in sync with actual Claude Code behavior; it's dated "станом на 2026-09"). Claims about when orchestration helps are backed by `references/evidence.md`.
- `code-review` — GitLab MR review run in CI: renders `prompt.tpl` and `run_review.sh.tpl`, then runs `claude --print` and posts the result as an MR comment. Placeholders (`{{PROJECT_PATH}}`, `{{DIFF_PATH}}`, `{{JIRA_TASK_SECTION}}`, `WORK_DIR_PLACEHOLDER`) are substituted externally — don't rename them. The review output is required to be in Ukrainian, and the prompt defers to the target project's `AGENTS.md`.

Target projects are expected to provide `AGENTS.md`/`CLAUDE.md`, optionally `.agents/docs/` and `openspec/`; the skills reference these paths in the projects they're installed into, not in this repo.
