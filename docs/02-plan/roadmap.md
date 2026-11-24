# Thamba implementation roadmap

Target the **18 December 2026** contest deadline with a public simulated Demo Town and an information-only Malvan. The stages below describe future implementation issues. [Architecture](architecture.md) · [Contest scope and metrics](../01-understand/problem-definition.md#contest-scope)

**Sizes** S is a focused change in one area, M is a feature with targeted integration, and L spans multiple components or requires deployment verification. **Parallel Codex Cloud** means an issue can run in an isolated checkout once the listed dependencies are available. Assign distinct files to concurrent tasks. A `No` issue owns a shared contract, allocation of a shared environment or a release decision and should be sequenced.

## M1 · Foundations

Exit when a clean checkout builds, verifies the layer rules and can deploy a minimal preview.

| Issue | Title | Acceptance criteria | Layer | Size | Parallel Codex Cloud |
| --- | --- | --- | --- | --- | --- |
| M1.1 | Establish the pnpm and App Router baseline | Verify the stable Next.js version at kickoff against the 16.4.6 planning baseline. Pin Node.js and pnpm, commit the lockfile, enable strict TypeScript and get a clean build from a frozen install. | Interface and Infrastructure | M | No. Establishes the shared workspace and build setup. |
| M1.2 | Enforce layer and bundle boundaries | Dependency-cruiser checks resolved paths and type imports, rejects sideways and outward imports and cycles, and proves browser entries cannot reach server-only modules. Core type-checking and lint rules reject platform I/O and system clock access. | All layers | M | Yes after M1.1. Own architecture rules and fixtures. |
| M1.3 | Set up automated checks | CI runs install, type checks, dependency-cruiser and Vitest. Provide execution hooks for property, contract, integration, Playwright and mutation checks as those suites land. Failed checks block release. | Infrastructure | M | Yes after M1.1. Run alongside M1.2 with distinct workflow files and a defined check command. |
| M1.4 | Provision non-production hosting and data | Configure a Vercel preview with Mumbai functions and an isolated Supabase `ap-south-1` project. A clean development environment can start local Supabase. Server configuration is validated and secrets remain server-only. | Infrastructure | M | No. Owns the shared preview and credential setup. |

## M2 · Core domain

Exit when a fake-clock run can quote, book, dispatch, accept, pick up and complete using pure rules and in-memory adapters.

| Issue | Title | Acceptance criteria | Layer | Size | Parallel Codex Cloud |
| --- | --- | --- | --- | --- | --- |
| M2.1 | Define domain types, port contracts and Results | Define Town and run scope, actor capabilities, clocks, typed errors, command keys and the repository and transaction contract fixtures. Record each port's consumers and the allowed transitions, including for synthetic scenarios and due-work scans. | Domain and Application | M | No. Shared contract boundary for M2 through M4. |
| M2.2 | Implement Town licence and fixed-fare rules | Tests cover the fictional simulation profile, Malvan denial, licence date boundaries and fare snapshot integrity. Quote expiry, a fare chart change and a licence lapse return typed outcomes. | Domain | M | Yes after M2.1. Own Town and Fare chart modules. |
| M2.3 | Implement Stand FIFO and dispatch strategies | Ranking, decline penalty and Stand fallback have independent interfaces. Tests cover a deterministic eligible order, one attempt per Driver per Booking, occupied drivers, withdrawals, queue rejoin rules, exhaustion and deadlines. | Domain | L | Yes after M2.1. Own dispatch and Stand queue modules. |
| M2.4 | Implement Driver binding and Trip lifecycle rules | Unit cases cover eligible invite state, exact expiry, pickup, completion and post-accept cancellation. Verify ownership and transitions from pre-accept offer to assigned Trip. | Domain | M | Yes after M2.1. Own identity and Trip modules. |
| M2.5 | Wire commands and reads to in-memory ports | Use case modules cover selection and quote, Booking, advance and response, status, queue operations and Trip actions. Each repository and transaction port has a memory adapter running the shared suite. Show a complete fake-clock journey and deterministic replay. | Application and Infrastructure | L | No. Integrates M2.2–M2.4 through the shared ports. |

## M3 · Persistence & auth

Exit when the same core journeys run against migrated Supabase through restricted principals and concurrent writes leave valid state.

| Issue | Title | Acceptance criteria | Layer | Size | Parallel Codex Cloud |
| --- | --- | --- | --- | --- | --- |
| M3.1 | Define schema, invariants and scoped grants | Rebuild from migrations. Verify RLS on every Thamba table, default denial, scoped references, partial unique indexes, version columns and due-time indexes. Seed fictional Town data and Malvan's information-only policy. SQL has no booking or dispatch rules. | Infrastructure | L | No. Owns the shared schema and migration sequence. Starts after M2.1. |
| M3.2 | Implement Supabase repositories and transactions | Run every in-memory repository and transaction contract against Supabase. Verify rollback, idempotency, stale versions and concurrent queue writes. Test transaction pooler scope isolation and browser denial of raw operational reads and writes. | Infrastructure | L | Yes after M2.5 and M3.1. Own persistence adapters and their contract fixtures. |
| M3.3 | Bind anonymous sessions and Coordinator membership | Riders and Drivers start anonymous sessions. Coordinators with pre-provisioned membership complete a magic-link round trip. Disabled, mismatched or missing memberships are denied on protected calls. Cover origin, callback and cache boundaries. | Infrastructure and Interface | M | Yes after M3.1. Own Auth adapter and callback. |
| M3.4 | Issue, redeem and revoke Driver invites | The Coordinator can issue a scoped, expiring link. A race consumes it once and binds one anonymous Driver. Verify replay, winner retry, expired or revoked tokens and recovery after session loss. Check that logging omits the token. | Application and Infrastructure | M | Yes after M3.2 and M3.3. Own Driver binding and invite modules. |
| M3.5 | Run the expiry sweep and delivery plumbing | Implement the protected route, due scan, one-minute scheduler and Vault setup. A missed HTTP call recovers without duplicate offers. Realtime publishes recipient-scoped wake-ups and the push outbox attempts immediate delivery with bounded retries. Verify two concurrent triggers and one lost wake-up. | Application, Infrastructure and Interface | L | No. Integrates schema, scheduling, delivery and protected ingress in the shared preview. |

## M4 · Apps (rider, driver, coordinator)

Exit when a judge can complete a synthetic Trip from the public link and a bound Driver and Coordinator can exercise the same flow.

| Issue | Title | Acceptance criteria | Layer | Size | Parallel Codex Cloud |
| --- | --- | --- | --- | --- | --- |
| M4.1 | Add localized layouts, shared notices and route wiring | Configure next-intl for `mr`, `hi` and `en` with Marathi at the unprefixed entry. Shared layouts render grievance contact and live ULIN from their projections. Prove session and locale survive a redirect and make message parity verifiable. | Interface | M | No. Establishes shared entry points and locale contracts. |
| M4.2 | Build Rider booking and status | A Rider sees the fixed fare before confirming, receives safe retry and stale-quote states and can follow dispatch, pickup and completion. Owned status polls trigger advancement. Malvan shows stands, illustrative fixed fares and the administrative Coordinator contact, with direct booking attempts denied. | Interface | L | Yes after M3.2, M3.3 and M4.1. Own Rider routes and messages. |
| M4.3 | Build the Driver PWA | The PWA installs and supports availability, invite redemption, pickup-only offers with deadlines, and accept or decline. Only the assigned Trip response reveals destination and fare. Pickup and completion work, reconnect recovers missed updates, and service-worker caches omit private data. | Interface | L | Yes after M3.4 and M4.1. Own Driver routes, messages and PWA assets. Final push verification needs M3.5. |
| M4.4 | Build Coordinator operations | A magic-link Coordinator can issue or revoke synthetic Driver invites, record availability, breaks and walk-ups, and replay queue position changes for their Stand. Show the reason for each skip, timeout, decline and cancellation. | Interface | L | Yes after M3.4 and M4.1. Own Coordinator routes and messages. |
| M4.5 | Publish a self-service Demo Town scenario | A public visitor starts an isolated synthetic run without Coordinator credentials. Seeded Drivers can complete the Trip through normal commands and demonstrate `no_driver_found`. Include localized demo grievance and simulated complaint paths and a shareable Town link. Two simultaneous runs do not affect one another. | Domain, Application and Interface | L | No. Integrates role apps and simulator with M3.5 and M4.2–M4.4. |

## M5 · Pilot hardening

Exit when release evidence covers dispatch safety, field-readiness questions and the contest simulation targets. Malvan remains information-only.

| Issue | Title | Acceptance criteria | Layer | Size | Parallel Codex Cloud |
| --- | --- | --- | --- | --- | --- |
| M5.1 | Test dispatch invariants and mutations | Property tests generate queue and trigger races and report reproducible seeds. Mutations on the licence gate, FIFO selection, one-time acceptance and expiry boundary are killed or documented as equivalent. Repeated calls produce no duplicate offer or Trip. | Domain and Application | M | Yes after M2.5 and M3.2. Own property and mutation suites. |
| M5.2 | Verify access, disclosures and low-connectivity behavior | Playwright covers direct Malvan denial, locale switching, cross-actor access and the absence of pre-accept destination or fare in payloads, Realtime, push and caches. Check grievance contact in every booking view, ULIN in a licensed test fixture, and install, notification and reconnect on a supported mobile device. | Interface and Infrastructure | L | Yes after M3.5 and M4.2–M4.5. Own browser and device verification. |
| M5.3 | Replay peak demand and measure fairness | Run three seeded days of 120 valid Bookings, 12 Drivers and 40 submissions in the busiest hour. Per run, median time to accept is at most 60 seconds among accepted Bookings, `no_driver_found` is at most 10%, and no offers violate eligible FIFO. Report counts and other outcomes. In a 120-Booking sequential replay with rejoin after each first-offer acceptance, first-offer counts differ by at most one. | Domain and Application | L | Yes after M4.5. Own the simulation harness and reports. |
| M5.4 | Verify telemetry, recovery and abuse limits | Verify rate limits, redaction and restricted logs. Alert on missed sweeps and stuck due work. Demonstrate recovery from a failed sweep and expired push subscription. Record retention and cleanup for synthetic runs. | Infrastructure | M | Yes after M3.5 and M4.5. Own operational checks and redaction fixtures. |
| M5.5 | Validate Stand assumptions and launch dependencies | Record at least 16 consented interviews, including at least six Drivers, two Coordinators, four hosts and four Riders. At least six Drivers review the demo rotation. Record anonymised evidence, publishable Malvan directory information and what still needs authority approval for any live pilot. | Domain and Interface | L | No. Requires field participants and verification of public content. |

## M6 · Ship & automate

Exit when the public contest build works from a clean browser, automated checks are passing, and issue recovery can be performed from the runbook.

| Issue | Title | Acceptance criteria | Layer | Size | Parallel Codex Cloud |
| --- | --- | --- | --- | --- | --- |
| M6.1 | Prepare operational and judge walkthroughs | Document the public scenario, optional PWA and Coordinator walkthroughs, expiry verification, secret rotation, redeploy and database recovery. Describe how to reproduce fixture runs and obtain evidence with synthetic data. | Interface and Infrastructure | M | Yes after M4.5. Own walkthrough and operations documents. |
| M6.2 | Automate verification and promotion | Gate release on architecture, type, unit, property, contract, integration and browser suites plus the targeted mutation checks. Automate migration and synthetic seed checks, deployment smoke and sweep health reporting. Prove preview credentials cannot access production and rehearse a compatible rollback. | Infrastructure | L | No. Owns release wiring and shared environment checks. |
| M6.3 | Ship and verify the contest demo | Deploy to the public Vercel URL with Mumbai Supabase, confirm public Demo Town and information-only Malvan, and run a clean-browser smoke. Record at least 20 distinct Trips completed through fare disclosure, Booking, acceptance, pickup and completion, including at least five in each locale. Verify a real scheduler sweep reaches the route after deployment. | All layers | M | No. Final promotion and release evidence after M5 and M6.1–M6.2. |
