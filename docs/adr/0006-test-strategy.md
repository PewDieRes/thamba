# ADR 0006 · Tests for domain rules, adapters and user journeys

## Context

The highest-risk defects are an unlicensed Booking, a destination leak, a duplicate acceptance or an unexplained out-of-order offer. Fast domain feedback and real Postgres and browser coverage address different failure modes.

## Decision

| Test type | Scope and initial tool |
| --- | --- |
| Unit | Vitest with fake clocks and injected strategies. Cover exact expiry and licence boundaries, fare snapshots, queue exceptions, pickup and completion, and role-scoped projections. |
| Property | fast-check generates sequences of arrivals, offer outcomes, skips, returns and cancellations. Check FIFO among eligible Drivers, no duplicate reservation or Trip, terminal state stability and idempotent replay. Report seed and shrink path when a case fails. |
| Contract | Run one reusable Vitest behavior suite per repository port and one for transactions, each against in-memory and Supabase implementations. Cover scope, versions, ordering, replay, rollback and concurrent conflict outcomes. |
| Integration | Run migrated local Supabase with real restricted RLS identities and a Supavisor transaction-mode smoke test in the deployed environment. Cover cross-actor and cross-Stand reads, pooled scope isolation, invite and offer races, signal payloads, unauthorised sweep calls and HTTP retry. |
| End to end | Playwright exercises quote → Booking → acceptance → pickup → completion and exhaustion, Malvan server-side denial, language switching, invite redemption and Coordinator audit. Include a mobile Driver PWA and test real notification delivery on a supported device in the preview. |
| Mutation | Stryker runs on the domain booking gate, ranking and expiry boundaries. Make survivors on named safety and state invariants release blockers unless an equivalent mutation is documented. Run targeted checks on policy changes and the full configured pass before release. |

CI runs dependency-cruiser, type-checking, unit, property and contract suites, RLS integration and the critical browser paths. Use injected clocks and seeded runs so expiry and fairness tests can run deterministically. Run real scheduler and push probes on a deployed preview. Collect the simulation counts and per-locale completion evidence required by the problem definition. [Contest metrics](../01-understand/problem-definition.md#contest-period-through-18-december-2026)

## Alternatives considered

| Alternative | Trade-off |
| --- | --- |
| Unit tests against mocks only | Fast and blind to Postgres constraints, grants and browser-visible payloads. |
| End-to-end tests for all domain variants | Realistic and slow for generated sequences, rare races and boundary times. |
| Coverage percentages as the only quality measure | Measures execution and leaves assertion strength untested. |

## Consequences

CI needs isolated migrated databases and controlled fixture provisioning. Adapter authors add contract cases at the port so both adapters stay aligned. Tests record which failures require a real deployment to reproduce and keep test credentials isolated.
