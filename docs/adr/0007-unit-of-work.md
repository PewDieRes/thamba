# ADR 0007 — Supabase Unit of Work

## Context

Dispatch can change a Booking, Ride offer, Driver queue entry and Trip in one decision. It also stores the associated events and any idempotency result. The database enforces cross-table reservation and Trip invariants with deferred foreign keys. Use cases make the decisions in TypeScript, and the server can run on instances that have no shared memory.

## Decision

Use a server-only, sessionless Supabase JavaScript client. The Unit of Work reads a database revision and queries repository projections at that revision. The transaction buffers writes in memory and exposes them to subsequent reads by the same callback. An application error discards the batch. One Postgres RPC commits a successful batch, including events and command replay data. This uses one database transaction per commit over the Data API. [Supabase JavaScript RPC reference](https://supabase.com/docs/reference/javascript/rpc)

Postgres locks the revision row, checks that the decision's snapshot is still current, applies writes in order, and checks deferred constraints before committing. Changes to the underlying tables bump the revision in the same transaction as the change. Versioned updates resolve the row's ID and then match both ID and expected version. A missing expected version means insert only. A zero-row update, stale snapshot, uniqueness collision or deadlock produces `ConcurrencyConflict`.

The three repository RPCs are restricted to `service_role`. Their SQL uses a fixed allowlist and leaves the existing actor policies and Rider contact grants in place. The composition entry point is server-only. Request boundaries must supply verified actor identities before calling protected use cases. Cookie-bound sessions belong to the separate SSR authentication path. The runtime's trusted repository RPCs differ from the actor-scoped database roles in ADR 0002. Verify that actor-scoped boundary before connecting the repository factory to a public request route. [Supabase SSR client documentation](https://github.com/supabase/ssr)

## Alternatives

- Independent Data API mutations can leave partial changes and cannot satisfy the deferred reservation constraints across requests.
- A direct Postgres transaction through Supavisor can hold a serializable snapshot across the callback. It would require direct database credentials and keep a pooled connection checked out while TypeScript runs.
- One domain-specific RPC per command would move dispatch decisions into SQL or duplicate the TypeScript rules.

## Consequences

The global revision also protects decisions based on list queries and absent rows, including changes to Stand eligibility, Town authority and competing Driver reservations. It can reject a decision after an unrelated Town writes. The single lock favors consistency over write throughput in the contest release. Callers that retry must recompute the decision with a fresh snapshot and clock reading.

The schema carries catalogue metadata absent from the ports. A new Stand gets the default name `Stand`, and a demo run added through a Town aggregate gets a 24-hour expiry. Existing run expiry, Stand names and translated pickup cues are preserved when their records are updated. Integration tests supply the companion records required by the existing dispatch constraints and exercise a complete ride through the same server factory.
