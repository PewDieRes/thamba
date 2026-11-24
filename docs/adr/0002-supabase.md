# ADR 0002 · Supabase in Mumbai

## Context

Dispatch changes the Booking, Ride offer, queue and Trip together. Browsers need session identity and low-latency updates. Contest hosting has to work with short-lived Vercel Functions.

## Decision

Use a Supabase project in AWS `ap-south-1` for Postgres, Auth and Realtime. Run stateful Vercel Functions in `bom1`. Connect server use cases through Supavisor transaction mode with TLS and prepared statements disabled. Use separate non-owner reader, command writer and sweep identities with RLS and scoped grants. Set verified actor and tenant context transaction-locally and test its isolation under pooling. Use separate migration credentials. [Supabase regions](https://supabase.com/docs/guides/platform/regions) · [Connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres) · [Vercel regions](https://vercel.com/docs/regions)

Apply RLS to every Thamba table. The browser has read access to its own generic Realtime signal rows. Authenticated server projections and command scopes govern access to business records. Postgres enforces shape, scoped references, unique and partial unique indexes and version-conditional writes. The domain computes transitions. The Supabase transaction adapter commits state, audit and delivery intents together.

For each application repository port, run the same contract cases against a fresh in-memory adapter and a migrated Supabase database. Make the durable adapter prove stale-write behavior, failure rollback, scope and outcome equivalence. [Persistence and trust boundaries](../02-plan/architecture.md#persistence-auth-and-trust-boundaries)

## Alternatives considered

| Alternative | Trade-off |
| --- | --- |
| Supabase Data API writes with one large transition RPC | Provides multi-row atomicity at the database boundary. Putting transition policy in a stored procedure would duplicate the TypeScript source of truth. |
| Data API calls for each row change | Straightforward for reads. Separate calls cannot atomically commit an offer, queue state and Trip. |
| Independently hosted Postgres, Auth and realtime provider | Gives independent provider choices and increases configuration and integration work. |

## Consequences

Use migrations, local Supabase and separate deployment projects. Monitor pool saturation and Realtime delivery. Database role integration tests are required in addition to repository contracts. A durable commit survives a missed notification, and clients can refetch the authoritative state.
