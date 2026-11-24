---
name: pr-ready
description: Verify a Thamba change for PR readiness and draft the PR body. Use when asked to prepare a PR or run the complete pre-PR checks. Do not use for a focused check, code review, evidence logging alone, or opening or publishing a PR.
---

# PR ready

Run all five commands from the repository root and retain each result, including
failures and commands blocked by missing prerequisites.

- `pnpm lint`
- `pnpm typecheck`
- `pnpm check:boundaries`
- `pnpm test:unit`
- `pnpm test:contract`

Summarize actionable failures with the command, the first relevant error and
file or test when available. Use the available diff or the user's supplied
change summary to draft every section of the
[PR template](../../../.github/pull_request_template.md). Include the issue
link, how to reproduce the verified behavior, and screenshots when applicable.
Fill the Codex evidence block from the actual run metadata and recorded
follow-up edits. Mark missing evidence as pending and check only verified DoD
items. Return the draft to the user. Publishing requires a separate request.
