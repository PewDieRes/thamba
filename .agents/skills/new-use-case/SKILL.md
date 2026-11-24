---
name: new-use-case
description: Scaffold a new Thamba application use case from a named behavior. Use for a new application command or query with its input, tests, ports, adapters, and composition wiring. Do not use for modifying an existing use case, creating a UI-only change, or reviewing architecture.
---

# New use case

1. Read [application rules](../../../src/application/AGENTS.md) and the named
   behavior spec. Identify the single operation, typed input and outcomes,
   domain policy, and ports it needs. Reuse existing domain types and ports.
2. Add `<verb-noun>.use-case.test.ts` in the new use case folder. Test the
   specified behavior with deterministic dependencies. Run the test before
   implementing the behavior and record the expected failure. If dependencies
   or test discovery cannot run, report that blocker and preserve the test-first
   sequence when verification becomes available.
3. Add `<verb-noun>.input.ts` with the input schema and
   `<verb-noun>.use-case.ts` with a named VerbNoun class exposing only
   `execute(input)` as its operation. Apply domain rules through domain modules
   and map errors to typed application outcomes. Add missing narrow port
   interfaces under `src/application/ports` and in-memory adapter stubs under
   `src/infrastructure`. Keep any repository port subject to the shared
   in-memory and Supabase contract suite before calling the adapter complete.
4. Construct the use case and inject its ports in
   `src/infrastructure/composition/container.ts`. Keep handlers and server
   actions limited to boundary work. If asked to put use-case logic in
   `src/app`, decline that placement and propose the application-layer entry.
   Run the targeted test again and report its result.
