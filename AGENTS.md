## Project

Thamba is a fixed-fare auto-rickshaw booking and dispatch app. The contest release lets Riders, Drivers and Stand Coordinators try booking, fair rotation and Trip completion with synthetic data in an isolated Demo Town. Malvan remains information-only while its licence is pending. See the [architecture](docs/02-plan/architecture.md) for system design and the [dispatch specification](docs/02-plan/specs/dispatch.md) for dispatch behavior and invariants.

## Commands

| Command | Purpose |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start the development server |
| `pnpm lint` | Run lint checks |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm check:boundaries` | Check layer and bundle boundaries |
| `pnpm test:unit` | Run unit tests |
| `pnpm test:contract` | Run shared adapter contract tests |
| `pnpm test:integration` | Run integration tests. Start local Supabase with `supabase start` first. |
| `pnpm test:e2e` | Run end-to-end tests |
| `pnpm test:mutation` | Run mutation tests |
| `pnpm build` | Build the app |

## Architecture rules

| Layer | Allowed imports |
|---|---|
| Domain (`src/domain`) | Domain modules and pure TypeScript built-ins. Declare domain policy interfaces in the domain. |
| Application (`src/application`) | Domain modules, local implementation modules and application contracts. Use application ports for external capabilities and cross-use-case orchestration. |
| Infrastructure (`src/infrastructure`) | Local infrastructure modules, application ports and domain types. Adapters may import runtime libraries. |
| Interface (`src/interface`, wired through `src/app`) | Application contracts, local interface modules and interface libraries. Only designated framework wiring entries may import the composition entry points. |

The infrastructure composition root constructs strategies, adapters and use cases, then injects them into interface factories. Use the table above to resolve import questions. Keep server-only dependencies out of the browser import graph. Dependency-cruiser enforces these boundaries, including resolved aliases and type-only imports, and rejects cycles. Never weaken a rule to make a check pass.

## SOLID and clean code

- SRP: one use case per module with a single public execute(input). Route handlers, server actions and components never contain business rules. Mapping lives in *.mapper.ts, validation in *.input.ts.
- OCP: variation points are strategy interfaces chosen in the composition root: DriverRankingPolicy (FairRotationPolicy), DeclinePenaltyPolicy (MoveToBackOfQueuePolicy, NoPenaltyPolicy), StandFallbackPolicy, DriverNotifier (WebPush, Composite, Simulated). Add behaviour by adding a class, not by adding if/else on town or env.
- LSP: every repository port has an in-memory and a Supabase adapter that pass the SAME contract suite in tests/contract. A new adapter is not done until it passes.
- ISP: ports are small and named for the caller's need. Split a port when two callers use disjoint halves of it. No "Service" god-interfaces.
- DIP: domain and application depend on abstractions in application/ports. Only infrastructure/composition/container.ts instantiates adapters. No `new SupabaseX()` anywhere else.
- Domain is pure: no I/O, no async, no Date.now() (take `now: Instant` as a parameter), no throwing for business outcomes (return Result).
- Functions ≤ 40 lines, cyclomatic complexity ≤ 10, files ≤ 200 lines, max 3 positional params (else an options object).
- No `any`, no non-null `!` assertions, no default exports (except Next.js route files), no magic numbers (named constants with units).
- Comments explain WHY, never WHAT. Delete dead code; no commented-out code; TODO only with an issue number.
- Errors: typed error codes (string unions). Exceptions only at infrastructure edges, converted to Result before reaching application.

## Naming

| Thing | Rule | Example |
|---|---|---|
| Files & folders | kebab-case, role suffix | request-ride.use-case.ts, booking-repository.ts, fair-rotation.policy.ts, booking.mapper.ts, supabase-booking-repository.ts |
| Tests | same name + .test.ts / .contract.ts / .spec.ts (e2e) | dispatch-planner.test.ts, booking-repository.contract.ts, rider-books-ride.spec.ts |
| Types, classes, interfaces | PascalCase, no I- prefix, no -Impl suffix | Booking, BookingRepository, SupabaseBookingRepository, InMemoryBookingRepository |
| Ports | role nouns | Clock, IdGenerator, DriverNotifier, UnitOfWork |
| Adapters | technology + port name | SystemClock, FixedClock, WebPushDriverNotifier |
| Use cases | VerbNoun, imperative | RequestRide, RespondToRideOffer, AdvanceDispatch |
| Domain events | NounPastTense | RideRequested, RideOfferExpired, TripCompleted |
| Functions | verb first, camelCase | quoteFare, planNextDispatchStep, maskPhoneNumber |
| Booleans | is/has/can/should | isOnline, hasPendingOffer, canAcceptOffer |
| Units in names | always | offerTimeoutSeconds, fareInPaise, pickupAt (Instant), leadTimeMinutes |
| Constants | SCREAMING_SNAKE with unit | DEFAULT_OFFER_TIMEOUT_SECONDS = 60 |
| IDs | branded types | BookingId, DriverId (never plain string across layers) |
| Status values | lowercase snake string unions | 'no_driver_found', 'cancelled_by_rider' |
| DB | snake_case, plural tables, *_at timestamps, *_id FKs | ride_offers.expires_at, bookings.rider_user_id |
| Env vars | SCREAMING_SNAKE; NEXT_PUBLIC_ only if safe in browser | SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL |
| Branches | type/issue-slug | feat/12-fair-rotation-policy, fix/31-offer-expiry-race |
| Commits | Conventional Commits, scope = module | feat(dispatch): add fair rotation policy |
| Ubiquitous language | use ONLY glossary terms from docs/01-understand/problem-definition.md | Rider (not user/customer), Stand (not hub), Ride offer (not request) |

## Testing

- Use TDD in domain and application. Write and run a failing test first, then implement the code to make it pass.
- Use property-based tests for the invariants in the [dispatch specification](docs/02-plan/specs/dispatch.md#invariants).
- Run the same contract suite for every repository port against both the in-memory and Supabase adapters. Both must pass.
- No snapshot tests for logic. In end-to-end tests, wait for observable conditions without fixed sleeps.

## Definition of Done

- Lint, typecheck, dependency boundaries, unit tests and contract tests all pass.
- New behaviour has tests. Update the docs when behaviour changes.
- Use Conventional Commits and the `type/issue-slug` branch format.
- Use `.github/pull_request_template.md` for the PR and fill in the Codex evidence block. Run `$log-evidence`.

## Code Review Rules

### P0

- Anything that lets an expired offer be accepted or breaks an invariant in docs/02-plan/specs/dispatch.md
- A rider phone number readable by anyone except the matched driver (while the booking is active) and the town coordinator
- Secrets or service-role key reachable from client code

### P1

- Layer-boundary violations; business logic in routes, server actions, components or SQL
- New behaviour without tests; `any`; unvalidated input at a boundary
- New table without RLS; PII in logs; misleading or glossary-violating names; a use case doing more than one thing

## Security & privacy

- Never log phone numbers. When a masked representation is needed, use `+91-XXXXX-X1234`.
- Keep the Supabase service-role key server-only.
- Supabase MCP is connected to DEV only.
