Booking, Ride offer, Stand queue and dispatch policies belong here.

[Booking](booking.ts) implements B1–B14 in the
[dispatch specification](../../../docs/02-plan/specs/dispatch.md#booking-state-machine).
It copies the confirmed fare terms and captures the dispatch deadline and Stand
search order on first entry to `requested`. Scheduled activation uses the
original confirmation and the current Town authority.

The caller supplies decision-time Town authority, the current Fare chart version,
the scoped and capped alternate Stand list, and the selected Driver's offer and
reservation facts. Booking returns a replacement aggregate and ordered domain
events for the caller to commit alongside the corresponding offer, Trip and
Driver slot changes.
