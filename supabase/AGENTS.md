# Supabase

- Migrations define schema, constraints, RLS, grants and atomic persistence only.
- SQL returns facts. Never decide business policy in SQL, including eligibility, scenario choice, pricing or ranking.
- Put policy in `src/domain` or `src/application` and share it across all adapters.
