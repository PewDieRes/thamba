[Booking acceptance](../dispatch/booking-offer-acceptance.ts) creates the
[Trip](trip.ts) with the assigned Driver and frozen fare. Arrival, pickup,
completion, and Driver cancellation require the assigned Driver's current
binding and verified session subject. The Booking's Rider may also cancel an
active Trip. Completion and cancellation release the Trip slot. A Driver
joins the Stand queue again through an explicit availability decision.

Booking transitions return the updated Trip record alongside the events.
The Booking keeps an active Trip reference while that Trip occupies the slot.
The caller commits the booking, offer, Trip, and slot changes together.
[Dispatch specification](../../../docs/02-plan/specs/dispatch.md#booking-state-machine)
