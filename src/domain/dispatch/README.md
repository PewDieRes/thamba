Booking, Ride offer, Stand queue and dispatch policies belong here.

[Booking](booking.ts) implements B1–B14 in the
[dispatch specification](../../../docs/02-plan/specs/dispatch.md#booking-state-machine).
It copies the confirmed fare terms and captures the dispatch deadline and Stand
search order on first entry to `requested`. Scheduled activation uses the
original confirmation and the current Town authority.

The caller supplies decision-time Town authority, the current Fare chart version,
and the scoped and capped alternate Stand list. For acceptance it also supplies
the offered Driver's verified session, current device binding and reserved queue
entry. Acceptance returns the replacement Booking, active Trip, removed queue
entry and ordered events for the caller to commit in the same decision.
After completion or cancellation, the Driver returns to the tail through
`joinDriverQueue` with the current Stand entries and an empty slot.

[The pending-offer projection](pending-offer-view.ts) exposes the offer ID,
pickup Landmark ID, pickup cue, deadline and server observation time in epoch
milliseconds, plus the remaining duration in milliseconds, to the offered Driver
before expiry. Supply the pickup cue from the pickup Landmark.
