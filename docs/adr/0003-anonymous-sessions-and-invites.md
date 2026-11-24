# ADR 0003 · Anonymous Rider and Driver sessions with single-use invites

## Context

The contest should allow a Rider to try a Booking without an account form. Drivers need an authenticated connection to a specific roster entry. Coordinators are accountable for that binding. The demo uses synthetic Driver records and avoids collecting Rider or Driver phone numbers. [Problem definition](../01-understand/problem-definition.md#contest-scope)

## Decision

Use Supabase anonymous sessions for Riders and Drivers. Verify the session with Supabase on protected entry points and map it to an application actor. Resolve Driver and Coordinator memberships from current durable records. Supabase anonymous users have the `authenticated` role and the `is_anonymous` claim. Anonymous Riders own their Bookings by Auth subject. Anonymous Drivers get Driver privileges only through an active binding. [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)

Pre-provision Coordinator membership for a permitted email and associate it with the verified non-anonymous Auth identity. Use Supabase email magic links and an allow-listed callback. Keep account creation and membership under operator control, and verify the Stand assignment on every Coordinator command. A missing or revoked membership grants no privileges. [Supabase passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless)

A Coordinator issues a short-lived invite for one synthetic Driver roster entry within their Stand and run. Generate a high-entropy opaque token and keep only its digest at rest. Give the Coordinator the HTTPS link once. Put the token in the URL fragment, scrub the fragment on load and redeem with an authenticated, same-origin POST after confirmation. A page visit does not consume it. Suppress referrers and keep the token out of analytics and logs.

The redemption transaction validates invite status, expiry, Stand and roster eligibility, and the current anonymous session. It consumes the invite and creates the binding together. Version and unique constraints ensure only one session wins. A retry by the winning session can recover the committed result without creating a second binding. For a lost session, the Coordinator revokes the old binding, withdraws unused invites and issues a new one. An active offer or Trip must be resolved through its recorded workflow before rebinding affects access. Rate-limit session creation, invite issue and redemption.

## Alternatives considered

| Alternative | Trade-off |
| --- | --- |
| Phone OTP for Riders and Drivers | Supports recovery and adds personal data, messaging cost and connectivity dependencies to the demo. |
| Shared Driver account per Stand | Eases sign-in and removes accountability for individual queue turns and offers. |
| Reusable roster links | Reduce invite administration and make forwarding or replay sufficient to claim a role. |

## Consequences

Clearing browser data, signing out or switching devices can lose access to an anonymous identity. The Coordinator recovery flow restores a Driver binding with an audit trail. The PWA uses the same session as the Driver browser flow. Magic-link email delivery and replay or concurrency cases need integration coverage.
