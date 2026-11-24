[Driver invites](driver-invite.ts) hold a SHA-256 token digest, the Driver,
the expiry, and the invite status. Redemption at or after the expiry fails.
Successful redemption returns the consumed invite and its active
[Driver device binding](driver-device.ts) for the caller to commit together.

The caller verifies the anonymous session, matches the digest, and checks
the Stand and roster before redeeming. Use the current durable binding when
authorizing an action. The caller handles transaction retries and resolves
an active offer or Trip through the recovery workflow before rebinding.
[ADR 0003](../../../docs/adr/0003-anonymous-sessions-and-invites.md)
