import { expect, it } from 'vitest';
import { Booking } from '@domain/dispatch/booking';
import type { BookingEvent } from '@domain/dispatch/booking-events';
import type { BookingStatus } from '@domain/dispatch/booking-status';
import type { Instant } from '@domain/shared/instant.value-object';
import * as f from './booking.fixtures';

function expectTransition(
  result: { readonly booking: Booking; readonly events: readonly BookingEvent[] },
  expected: { readonly status: BookingStatus; readonly events: readonly BookingEvent['type'][] },
  now: Instant,
): void {
  expect(result.booking.state.status).toBe(expected.status);
  expect(result.events.map((event) => event.type)).toEqual(expected.events);
  for (const event of result.events) {
    expect(event).toMatchObject({ bookingId: f.bookingId, townId: f.townId, occurredAt: now });
  }
}

it('B1 schedules a future pickup with the captured due time and confirmed fare', () => {
  const now = f.at(0);
  const result = f.unwrap(Booking.schedule(f.schedule, now));
  expectTransition(result, { status: 'scheduled', events: ['BookingScheduled'] }, now);
  expect(result.booking.state).toMatchObject({
    pickupAt: f.schedule.pickupAt,
    requestDueAt: f.at(f.dueInMilliseconds),
    fare: f.quote.fare,
  });
  expect(result.booking.state.requestedAt).toBeUndefined();
  expect(result.booking.state.offer).toBeUndefined();
  expect(result.booking.state.trip).toBeUndefined();
});

it('B2 makes an immediate request due with frozen fare and a dispatch deadline', () => {
  const now = f.at(0);
  const result = f.unwrap(Booking.request(f.request, now));
  expectTransition(result, { status: 'requested', events: ['BookingRequested'] }, now);
  expect(result.booking.state).toMatchObject({
    requestedAt: now,
    dispatchDeadline: f.at(f.DEFAULT_DISPATCH_IN_MILLISECONDS),
    fare: f.quote.fare,
    searchStandIds: [f.standId],
  });
  expect(result.events[0]).toMatchObject({ actor: { type: 'rider', riderId: f.riderId } });
});

it.each([0, 2 * f.MINUTE_IN_MILLISECONDS])(
  'B3 activates a due schedule with delay %i ms',
  (delay) => {
    const scheduled = f.makeScheduled();
    const now = f.at(f.dueInMilliseconds + delay);
    const result = f.unwrap(scheduled.activate(f.canBook, now));
    expectTransition(result, { status: 'requested', events: ['BookingRequested'] }, now);
    expect(result.booking.state.requestedAt).toBe(now);
    expect(result.booking.state.fare).toEqual(f.quote.fare);
    expect(scheduled.state.status).toBe('scheduled');
  },
);

it('B4 closes a due schedule if booking authority lapsed', () => {
  const now = f.at(f.dueInMilliseconds);
  const result = f.unwrap(f.makeScheduled().closeSchedule(f.cannotBook, now));
  expectTransition(result, { status: 'no_driver_found', events: ['BookingNoDriverFound'] }, now);
  expect(result.booking.state.requestedAt).toBeUndefined();
  expect(result.booking.state.noDriverFoundReason).toBe('booking_unavailable');
  expect(result.events[0]).toMatchObject({
    reason: 'booking_unavailable',
    actor: f.dispatchActor,
  });
});

it('B5 moves to offering with the selected Driver and scoped Ride offer event', () => {
  const now = f.at(1);
  const result = f.unwrap(f.makeRequested().issueOffer(f.issue, now));
  expectTransition(result, { status: 'offering', events: ['RideOfferCreated'] }, now);
  expect(result.booking.state.offer).toEqual(f.offer);
  expect(result.events[0]).toMatchObject({ ...f.offer, actor: f.dispatchActor });
});

it.each([
  [f.decline, 2, 'RideOfferDeclined'],
  [f.expire, f.MINUTE_IN_MILLISECONDS, 'RideOfferExpired'],
  [f.withdraw, 2, 'RideOfferWithdrawn'],
  [f.decline, f.MINUTE_IN_MILLISECONDS, 'RideOfferExpired'],
] as const)('B6 resolves %j at %i ms with %s', (input, timeInMilliseconds, event) => {
  const original = f.makeOffering();
  const now = f.at(timeInMilliseconds);
  const result = f.unwrap(original.closeOffer(input, now));
  expectTransition(result, { status: 'requested', events: [event] }, now);
  expect(result.booking.state.offer).toBeUndefined();
  expect(result.booking.state.requestedAt).toBe(original.state.requestedAt);
  expect(result.booking.state.dispatchDeadline).toBe(original.state.dispatchDeadline);
});

it('B7 assigns the Driver and emits acceptance and Trip creation once', () => {
  const now = f.at(f.MINUTE_IN_MILLISECONDS - 1);
  const result = f.unwrap(f.makeOffering().acceptOffer(f.accept, now));
  expectTransition(
    result,
    { status: 'accepted', events: ['RideOfferAccepted', 'BookingAccepted', 'TripCreated'] },
    now,
  );
  expect(result.booking.state.offer).toBeUndefined();
  expect(result.booking.state.trip).toMatchObject({ tripId: f.tripId, driverId: f.driverId });
  expect(result.events[2]).toMatchObject({
    actor: f.driverActor,
    tripId: f.tripId,
    driverId: f.driverId,
  });
});

it.each([
  ['B8', f.makeAccepted, 'reportArrival', 'driver_arrived', 'DriverArrived', 'arrivedAt'],
  ['B9', f.makeArrived, 'confirmPickup', 'in_trip', 'TripStarted', 'pickedUpAt'],
] as const)('%s records Driver progress', (_id, make, command, status, event, timeField) => {
  const now = f.at(5);
  const result = f.unwrap(make()[command](f.driverId, now));
  expectTransition(result, { status, events: [event] }, now);
  expect(result.booking.state.trip?.[timeField]).toBe(now);
});

it('B10 completes the Trip and clears the active Trip reference', () => {
  const now = f.at(5);
  const result = f.unwrap(f.makeInTrip().completeTrip(f.driverId, now));
  expectTransition(result, { status: 'completed', events: ['TripCompleted'] }, now);
  expect(result.booking.state.trip).toBeUndefined();
  expect(result.events[0]).toMatchObject({ tripId: f.tripId, driverId: f.driverId });
});

it.each([
  [f.DEFAULT_DISPATCH_IN_MILLISECONDS, false, 'dispatch_deadline'],
  [5, false, 'booking_unavailable'],
  [5, true, 'stands_exhausted'],
] as const)('B11 at %i ms with authority %s records %s', (timeInMilliseconds, canBook, reason) => {
  const now = f.at(timeInMilliseconds);
  const result = f.unwrap(f.makeRequested().endSearch({ canBook, areStandsExhausted: true }, now));
  expectTransition(result, { status: 'no_driver_found', events: ['BookingNoDriverFound'] }, now);
  expect(result.booking.state.noDriverFoundReason).toBe(reason);
  expect(result.events[0]).toMatchObject({ reason });
});

it.each([
  [f.DEFAULT_DISPATCH_IN_MILLISECONDS, 'dispatch_deadline', 'RideOfferExpired'],
  [5, 'booking_unavailable', 'RideOfferWithdrawn'],
] as const)(
  'B12 closes the pending offer and dispatch at %i ms',
  (timeInMilliseconds, reason, event) => {
    const now = f.at(timeInMilliseconds);
    const offer = reason === 'dispatch_deadline' ? { ...f.offer, expiresAt: now } : f.offer;
    const offering = f.unwrap(
      f.makeRequested().issueOffer({ ...f.canBook, offer }, f.at(1)),
    ).booking;
    const result = f.unwrap(offering.endOffering(f.cannotBook, now));
    expectTransition(
      result,
      { status: 'no_driver_found', events: [event, 'BookingNoDriverFound'] },
      now,
    );
    expect(result.booking.state.offer).toBeUndefined();
    expect(result.booking.state.noDriverFoundReason).toBe(reason);
  },
);

it.each([
  ['scheduled', 5, []],
  ['requested', 5, []],
  ['offering', 5, ['RideOfferWithdrawn']],
  ['offering', f.MINUTE_IN_MILLISECONDS, ['RideOfferExpired']],
  ['accepted', 5, ['TripCancelled']],
  ['driver_arrived', 5, ['TripCancelled']],
  ['in_trip', 5, ['TripCancelled']],
] as const)('B13 Rider cancels from %s at %i ms', (status, timeInMilliseconds, events) => {
  const now = f.at(timeInMilliseconds);
  const result = f.unwrap(f.makeBooking[status]().cancelByRider(f.riderId, now));
  expectTransition(
    result,
    { status: 'cancelled_by_rider', events: [...events, 'BookingCancelledByRider'] },
    now,
  );
  expect(result.booking.state.offer).toBeUndefined();
  expect(result.booking.state.trip).toBeUndefined();
});

it.each(['accepted', 'driver_arrived', 'in_trip'] as const)(
  'B14 Driver cancels from %s',
  (status) => {
    const now = f.at(5);
    const result = f.unwrap(f.makeBooking[status]().cancelByDriver(f.driverId, now));
    expectTransition(
      result,
      { status: 'cancelled_by_driver', events: ['TripCancelled', 'BookingCancelledByDriver'] },
      now,
    );
    expect(result.booking.state.trip).toBeUndefined();
  },
);
