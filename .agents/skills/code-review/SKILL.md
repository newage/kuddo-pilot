---
name: code-review
description: Run an AI-powered code review for a GitLab merge request. Use this skill whenever the user asks to review MR changes, check code quality, analyse a diff, or run an automated review. Triggers on phrases like "зроби код ревью", "review MR", "перевір зміни", "запусти ревью", "ai review".
---

# AI Code Review

Automated code review that analyses a diff and posts the result as an MR comment.

## Trigger phrases

- "зроби код ревью"
- "запусти ai ревью"
- "review MR"
- "перевір зміни у МР"
- "run code review"

## How it works

1. Generate a diff between the MR source commit and the target branch.
2. Optionally fetch the Jira task description if the branch name contains `LK-XXXXX`, `EC-XXXXX`, `SC-XXXXX`, or `RN-XXXXX`.
3. Render `prompt.tpl` with project path, diff path, and Jira section (if found).
4. Run `claude --print - < prompt.txt` on the project directory.
5. Post the review output as an MR comment.

## Generating the diff

The diff is generated with a project-specific `generate_diff.sh` script (path varies per project — see the project's `ai-code-review.yml` for the exact path):

```bash
./<project_scripts_dir>/generate_diff.sh <base_branch> <compare_commit> <output_file>
```

- Uses `git merge-base` to diff only the changes introduced in the MR (not the full branch divergence).
- **Deleted files** — listed as `deleted: <path>` without content to save AI context tokens.
- **Modified/added files** — full unified diff using `--diff-algorithm=histogram`.
- **Excluded automatically:** `*.lock`, `*.min.js`, `*.min.css`, `package-lock.json`, `yarn.lock`, `composer.lock`, `*.map`, `generated-ci-configs/`.

The output file includes a header with base branch, compare commit, merge base, commit log, and a changed-files summary before the diff body.

## Key files

| File | Purpose |
|------|---------|
| `.agents/skills/code-review/prompt.tpl` | Review prompt template |
| `.agents/skills/code-review/run_review.sh.tpl` | Execution script template |
| `<project_scripts_dir>/generate_diff.sh` | Diff generator (project-specific path) |

## Prompt template placeholders

| Placeholder | Value |
|-------------|-------|
| `{{PROJECT_PATH}}` | Cloned repo root |
| `{{DIFF_PATH}}` | Path to the generated diff file |
| `{{JIRA_TASK_SECTION}}` | Jira task file path (empty when no Jira key found) |

## Modifying the review prompt

Edit `prompt.tpl`. Do **not** rename the placeholders — they are substituted via `python3` using env vars.

## Modifying the execution script

Edit `run_review.sh.tpl`. The only substitution is `WORK_DIR_PLACEHOLDER` → actual work dir path. The script uses stdin redirect (`< prompt.txt`) to avoid shell injection.
