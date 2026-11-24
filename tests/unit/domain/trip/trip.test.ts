import { assert, expect, it } from 'vitest';
import { revokeDevice } from '@domain/identity/driver-device';
import { err } from '@domain/shared/result';
import { transitionTrip } from '@domain/trip/trip';
import type { Trip, TripCommand } from '@domain/trip/trip';
import * as f from '../dispatch/booking.fixtures';

const now = f.at(5);
const commands = {
  reportArrival: { type: 'reportArrival', driver: f.driverSession },
  confirmPickup: { type: 'confirmPickup', driver: f.driverSession },
  completeTrip: { type: 'completeTrip', driver: f.driverSession },
  cancelByDriver: { type: 'cancelByDriver', driver: f.driverSession },
  cancelByRider: { type: 'cancelByRider', riderId: f.riderId },
} satisfies Record<TripCommand['type'], TripCommand>;

function getAcceptedTrip() {
  const trip = f.makeAccepted().state.trip;
  assert(trip);
  return trip;
}

function getTripAtStatus(status: Trip['status']) {
  let trip: Trip = getAcceptedTrip();
  if (status === 'accepted') return trip;
  if (status === 'cancelled_by_driver')
    return f.unwrap(transitionTrip(trip, commands.cancelByDriver, now)).trip;
  if (status === 'cancelled_by_rider')
    return f.unwrap(transitionTrip(trip, commands.cancelByRider, now)).trip;
  trip = f.unwrap(transitionTrip(trip, commands.reportArrival, f.at(3))).trip;
  if (status === 'driver_arrived') return trip;
  trip = f.unwrap(transitionTrip(trip, commands.confirmPickup, f.at(4))).trip;
  if (status === 'in_trip') return trip;
  return f.unwrap(transitionTrip(trip, commands.completeTrip, now)).trip;
}

it('creates the Trip at acceptance with its assignment and frozen fare terms', () => {
  const acceptedAt = f.at(2);
  const { booking, trip, events } = f.unwrap(f.makeOffering().acceptOffer(f.accept, acceptedAt));
  expect(trip).toBe(booking.state.trip);
  expect(trip).toMatchObject({
    status: 'accepted',
    acceptedAt,
    bookingId: f.bookingId,
    tripId: f.tripId,
    riderId: f.riderId,
    driverId: f.driverId,
    standId: f.standId,
    townId: f.townId,
    fare: f.quote.fare,
  });
  expect(events.map(({ type }) => type)).toEqual([
    'RideOfferAccepted',
    'BookingAccepted',
    'TripCreated',
  ]);
  expect(events[2]).toMatchObject({
    type: 'TripCreated',
    fare: f.quote.fare,
    occurredAt: acceptedAt,
  });
});

const transitions = [
  [
    'accepted',
    {
      reportArrival: 'DriverArrived',
      cancelByDriver: 'TripCancelled',
      cancelByRider: 'TripCancelled',
    },
  ],
  [
    'driver_arrived',
    {
      confirmPickup: 'TripStarted',
      cancelByDriver: 'TripCancelled',
      cancelByRider: 'TripCancelled',
    },
  ],
  [
    'in_trip',
    {
      completeTrip: 'TripCompleted',
      cancelByDriver: 'TripCancelled',
      cancelByRider: 'TripCancelled',
    },
  ],
  ['completed', {}],
  ['cancelled_by_driver', {}],
  ['cancelled_by_rider', {}],
] as const satisfies readonly [Trip['status'], Partial<Record<TripCommand['type'], string>>][];

it.each(transitions)('enforces every legal and illegal command from %s', (status, expected) => {
  const trip = getTripAtStatus(status);
  const allowed: Readonly<Partial<Record<TripCommand['type'], string>>> = expected;
  for (const command of Object.values(commands)) {
    const eventType = allowed[command.type];
    const result = transitionTrip(trip, command, now);
    if (eventType === undefined) {
      expect(result).toEqual(err({ code: 'illegal_transition' }));
      continue;
    }
    const transition = f.unwrap(result);
    expect(transition.event).toMatchObject({ type: eventType, occurredAt: now, tripId: f.tripId });
    expect(transition.trip).not.toBe(trip);
    expect(trip.status).toBe(status);
  }
});

it.each(['accepted', 'driver_arrived', 'in_trip'] as const)(
  'records the reason and decision time when either party cancels from %s',
  (status) => {
    const trip = getTripAtStatus(status);
    for (const [command, reason, actor] of [
      [commands.cancelByDriver, 'cancelled_by_driver', f.driverActor],
      [commands.cancelByRider, 'cancelled_by_rider', { type: 'rider', riderId: f.riderId }],
    ] as const) {
      const result = f.unwrap(transitionTrip(trip, command, now));
      expect(result.trip).toMatchObject({ status: reason, reason, endedAt: now });
      expect(result.event).toMatchObject({ type: 'TripCancelled', reason, actor });
    }
  },
);

it('records the arrival, pickup, and completion times and returns the ended Trip', () => {
  const input = f.makeInTrip();
  const { booking, trip, events } = f.unwrap(input.completeTrip(f.driverSession, now));
  expect(trip).toMatchObject({
    status: 'completed',
    arrivedAt: f.at(3),
    pickedUpAt: f.at(4),
    endedAt: now,
  });
  expect(booking.state.trip).toBeUndefined();
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ type: 'TripCompleted', actor: f.driverActor });
});

it.each([
  ['accepted', commands.reportArrival],
  ['driver_arrived', commands.confirmPickup],
  ['in_trip', commands.completeTrip],
  ['accepted', commands.cancelByDriver],
] as const)('rejects unbound actors for the Driver command in %s', (status, command) => {
  const trip = getTripAtStatus(status);
  const revoked = f.unwrap(revokeDevice(f.driverSession.device, now));
  expect(transitionTrip(trip, { ...command, driver: f.otherDriverSession }, now)).toEqual(
    err({ code: 'driver_mismatch' }),
  );
  expect(
    transitionTrip(
      trip,
      { ...command, driver: { ...f.driverSession, subject: f.otherSubject } },
      now,
    ),
  ).toEqual(err({ code: 'session_subject_mismatch' }));
  expect(
    transitionTrip(trip, { ...command, driver: { ...f.driverSession, device: revoked } }, now),
  ).toEqual(err({ code: 'DEVICE_REVOKED' }));
});

it('rejects cancellation by another Rider', () => {
  const result = transitionTrip(
    getAcceptedTrip(),
    { type: 'cancelByRider', riderId: f.otherRiderId },
    now,
  );
  expect(result).toEqual(err({ code: 'rider_mismatch' }));
});
