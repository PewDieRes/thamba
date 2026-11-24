# ADR 0001 · Hexagonal architecture in one Next.js project

## Context

Thamba has four entry surfaces for dispatch and booking behavior, including rider status polling and scheduled work. The same policy must apply across these surfaces and support a synthetic contest run. Driver visibility, fare disclosure and licence validity require auditable decisions.

## Decision

Use four layers. The domain is pure strict TypeScript. The application layer owns individual use cases, ports and role-scoped read projections. Infrastructure supplies Supabase, in-memory, clock and notification adapters and the composition root. Interface modules implement Next.js routes, Server Actions, UI, locale and PWA interactions.

Only the outer composition root connects the interface to adapters. Framework-discovered App Router files delegate to the composed handlers and views. Inject the three domain dispatch strategies for ranking, decline penalty and Stand fallback. Give use cases narrow repository and transaction ports. Domain and application return typed Results. Infrastructure edges catch failures and translate them.

Run dependency-cruiser on resolved paths and type imports. Enforce inward edges, no cycles, a pure core and a browser graph that excludes server modules. Pin the current stable Next.js App Router and pnpm versions at setup. [Architecture and import rules](../02-plan/architecture.md#layers-and-import-rules)

## Alternatives considered

| Alternative | Trade-off |
| --- | --- |
| Feature modules backed directly by Next.js and Supabase | Fast to scaffold. Each entry point would have to maintain the same rules and access boundaries. |
| Separate Web, Auth and dispatch services | Adds independent deployment and network failure modes for a one-Stand contest scope. |
| One server module with a generic repository | Has fewer interfaces. It exposes unrelated data operations to callers and weakens shared contract coverage. |

## Consequences

Domain tests run without a browser, server or database. Time and policy variants are explicit test inputs. New entry points reuse existing commands. Maintainers need to keep DTO mapping explicit and review framework entry shims so composition stays at the boundary.
