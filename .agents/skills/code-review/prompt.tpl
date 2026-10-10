Perform a code review for project {{PROJECT_PATH}}

**Important: write the entire review output in Ukrainian.**

{{JIRA_TASK_SECTION}}

Diff:
{{DIFF_PATH}}

Before starting, read the project rules:
{{PROJECT_PATH}}/AGENTS.md

---

## Review instructions

**Step 1 — Read the diff**
Open {{DIFF_PATH}} and build a complete picture of what changed:
- new and modified files (with their changes)
- deleted files (listed as "deleted: <path>" in the diff header — treat each deletion as a change that may affect dependents)

**Step 2 — File-by-file analysis**
Go through each changed file one at a time to keep context focused. For each file check:
- correctness of the changes
- impact on other parts of the system (callers, dependents, shared state)
- completeness — does the file-level change make sense on its own, or does it require a matching change elsewhere that is missing?

**Step 3 — Project rules first**
Before raising any best-practice finding, check {{PROJECT_PATH}}/AGENTS.md. If the project rules explicitly allow or prescribe a pattern, do not flag it as a violation. Project rules override general best practices.

**Step 4 — Identify issues**
For every file collect findings across these categories:
- bugs
- security issues
- performance issues
- best-practice violations (project rules take priority — see Step 3)
- potential edge cases
- missing impact handling (a deleted or changed file that breaks something elsewhere)
- AI documentation coverage: if new functionality, modules, workflows, or conventions are introduced — check whether the relevant `AGENTS.md` or `.agents/docs/` files were updated accordingly; flag cases where the changes require an AI documentation update but none was made
- specification coverage — **only if the project maintains a specs directory describing intended behaviour (commonly `openspec/specs/`, but the name, location, and internal layout — capability folders, file names — vary per project); look for it under {{PROJECT_PATH}} and check {{PROJECT_PATH}}/AGENTS.md for where it lives before assuming a path. Skip this bullet entirely if no such directory exists.** Those specs state the *intended* behaviour, not a description of the current code. For each behavioural change in the diff, open the matching capability spec (wherever the project keeps it, e.g. `<specs-dir>/<capability>/spec.md` or equivalent) and judge whether it still describes the behaviour correctly. Judge by content — a touched spec file proves nothing, an untouched one is not automatically a finding.
  - do **not** flag: a bug fix that makes the code match what the spec already says (the spec is right and must stay unchanged); refactoring, performance work, logging, or test-only changes
  - **do** flag: a new or removed endpoint with no capability added or removed; a changed contract — fields, status codes, validation limits, defaults — that the spec still describes the old way; a schema change not reflected in the corresponding data-model capability; a condition that now applies to several endpoints but was written into a single capability instead of the shared rules one
- if a Jira task was provided above: check whether all requirements described in the task are fully implemented; if anything is missing or only partially done, document it

---

## Output format

Structure the output in the following order.

### Missing or incomplete Jira requirements
*(Include this section only if a Jira task was provided above. If not — omit this section entirely.)*

For each requirement from the Jira task that is missing or only partially implemented, write:
**Requirement:** what was expected
**Status:** Missing / Partially implemented
**Details:** what specifically is absent or incomplete

If all requirements are fully implemented, write: "All Jira requirements appear to be implemented."

---

### Issues by priority

Group all findings into four sections — only include a section if it has findings:

#### 🔴 Critical
#### 🟠 High
#### 🟡 Medium
#### 🔵 Low

Each finding:
**[SEVERITY] File: `path/to/file.ext` — short title**
- **Problem:** what is wrong and why it matters
- **Recommendation:** concrete fix

Missing AI documentation updates go into 🔵 Low unless the change introduces a new workflow or convention that directly affects how AI agents operate in this project, in which case use 🟡 Medium.

---

### Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | N |
| 🟠 High | N |
| 🟡 Medium | N |
| 🔵 Low | N |
| **Total** | **N** |

**Must fix before merge:** list only Critical and High findings by title.
If there are no Critical or High findings, write: "No blocking issues found."
