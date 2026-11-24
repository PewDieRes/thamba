---
name: log-evidence
description: Record one Thamba Codex run in the evidence ledger or log a reported Codex mistake. Use when asked to log a run or mistake, or when completing a change whose Definition of Done requires evidence. Do not use for reading the ledger, drafting PR evidence alone, or recording ordinary application defects without an identified Codex mistake.
---

# Log evidence

From the repository root, use [scripts/append-log.mjs](../../../scripts/append-log.mjs)
to validate and append each entry. Use the run metadata supplied by the owner or
captured by the actual run. Confirm the disposition and its reason from the
review record or the user's feedback. If a required fact is unavailable, ask for
it before recording the run. Use `TODO` for a PR, commit, or fix link that does
not yet exist.

Run `node scripts/append-log.mjs model < entry.json` with one JSON object on
stdin. Supply `date` (YYYY-MM-DD), `promptId`, `stage` (uppercase stage name),
`surface` (CLI / IDE / Cloud / App / GitHub / Action / Scheduled), `model`,
`effort`, `rationale` (why that model and effort), `outcome` (accepted /
revised / rejected), `reason`, and `link` (PR or commit).

When told Codex made a mistake, also run
`node scripts/append-log.mjs mistake < mistake.json`. Supply `what`, `caughtBy`
(test / review / property test / human), and `fixLink` (the fix PR or commit).
If the run already has an evidence row, append only the mistake. Keep phone
numbers, credentials, and other personal data out of both ledgers.
