---
name: add-town
description: Import a named Thamba Town from curated CSV files into a local Supabase seed migration and Landmark translations. Use when asked to add or re-import a Town from a Town's data/towns raw CSV directory. Do not use for hand-editing copy, changing a Town's licence status, deploying seeds, or operating a live Town.
---

# Add town

1. Read the Town catalogue schema and existing migrations and locale files.
   Read the requested lowercase kebab-case slug's
   `data/towns/<slug>/raw/*.csv`. Parse CSV with a proper parser that handles
   quoted fields and embedded commas. Define Zod schemas against the actual
   catalogue columns. Validate required fields, stable and unique identifiers,
   cross-file Stand and Landmark references, fare amounts in integer paise,
   coordinate ranges where applicable, and complete `mr`, `hi`, and `en`
   Landmark names. Report file, row and field for invalid data and stop before
   writing. If the schema or source data is missing, identify what is missing.
2. Generate a timestamped data-only migration under `supabase/migrations` using
   existing keys and foreign-key order. Make seed generation deterministic
   for the same input and safely quote SQL values. Keep Landmark names and cues
   in the curated catalogue as specified by [ADR 0005](../../../docs/adr/0005-localisation.md),
   and add matching Landmark-name i18n keys across all three locales using the
   existing key convention. Verify migration and locale parity locally.
3. Preserve Malvan's information-only status and use synthetic data for Demo
   Town. Print a Coordinator checklist covering Stand and Landmark accuracy,
   pickup cues in all locales, fare and route coverage, grievance contact,
   licence status, and a local smoke test. Leave the migration ready for review
   without applying it to any linked environment.
