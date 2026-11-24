# ADR 0004 · Deadline-driven dispatch with a scheduled sweep

## Context

An unanswered offer must expire even when browsers leave or a notification is missed. Vercel requests are short-lived. Driver responses, Rider polls and scheduler retries can arrive together.

## Decision

Keep deadlines and `next_due_at` in Postgres. The application calls the pure domain with a clock value. `AdvanceDispatch` can return unchanged state, close an expired or withdrawn offer, allocate the next eligible Driver or finish dispatch. A transactional version check ensures overlapping triggers cannot issue duplicate offers. Re-read state and time on contention. The domain treats `now >= deadline` as expired, even if no sweep has run.

Trigger one advance after Booking creation, after an authorized Driver response, on an owned Rider status poll and from a scheduled sweep. Driver response validates the deadline with its own transaction. A late reply returns the typed expired outcome, and the response path still invokes advancement. A retry may see newer committed state. The poll uses POST because it can write.

Run `pg_cron` once per minute. It uses `pg_net` to POST to the Vercel sweep route with an environment-scoped bearer from Supabase Vault. The route authenticates the token and drains a capped batch ordered by `next_due_at` and stable ID. Read only the IDs needed to initiate separately scoped transactions. Keep work retryable when a row fails or the request budget expires. The sweep also services due synthetic steps and undelivered push intents with separate caps. [Supabase pg_net](https://supabase.com/docs/guides/database/extensions/pg_net) · [Supabase Vault](https://supabase.com/docs/guides/database/vault)

Realtime and Web Push wake clients after commit. Attempt new push intents promptly within available request budget, then retry through the sweep. Deduplicate intents by event and subscription, suppress obsolete offers and cap retries at the offer deadline. Foreground and reconnect reads recover from missed wake-ups.

## Alternatives considered

| Alternative | Trade-off |
| --- | --- |
| Timers in Vercel Functions or a persistent worker | In-process timers can disappear with an instance. A dedicated worker adds another service to operate. |
| Client polling alone | Responsive while a client is connected. Idle conversations could leave the queue reserved. |
| Expiry and ranking in a scheduled SQL procedure | Eliminates an HTTP call and duplicates domain policy in the database. |
| A delayed job service for every offer | Can target the exact deadline and adds an externally managed queue with delivery and cancellation semantics. |

## Consequences

Deadline validity is precise. With no attached client, advancing to the next offer can lag by a sweep interval plus delivery or backlog delay. Monitor the route's last successful execution, pg_net HTTP failures and oldest due age. Load tests must measure the effect on fulfilment and the 60-second median acceptance target. [Contest metrics](../01-understand/problem-definition.md#contest-period-through-18-december-2026)
