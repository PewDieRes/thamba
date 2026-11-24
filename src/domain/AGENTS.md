## Domain

- Keep domain code pure and synchronous. No I/O, `async` or `Date.now()`. Pass decision time as `now: Instant`.
- Return `Result` for business outcomes.
- Keep entities immutable. State transitions return new instances.
