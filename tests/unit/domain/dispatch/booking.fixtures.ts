import { assert } from 'vitest';
import { Booking } from '@domain/dispatch/booking';
import type { BookingStatus } from '@domain/dispatch/booking-status';
import { Duration } from '@domain/shared/duration.value-object';
import {
  createBookingId,
  createDemoRunId,
  createDriverId,
  createLandmarkId,
  createRideOfferId,
  createRiderId,
  createRouteId,
  createSessionSubject,
  createStandId,
  createStandCoordinatorId,
  createTownId,
  createTripId,
} from '@domain/shared/ids.value-object';
import { Instant } from '@domain/shared/instant.value-object';
import { Money } from '@domain/shared/money.value-object';
import type { Result } from '@domain/shared/result';

export function unwrap<T, E>(result: Result<T, E>): T {
  assert(result.ok, result.ok ? undefined : JSON.stringify(result.error));
  return result.value;
}

function uuid(suffix: number): string {
  return `00000000-0000-0000-0000-${suffix.toString().padStart(12, '0')}`;
}

export const bookingId = unwrap(createBookingId(uuid(1)));
export const riderId = unwrap(createRiderId(uuid(2)));
export const otherRiderId = unwrap(createRiderId(uuid(3)));
export const driverId = unwrap(createDriverId(uuid(4)));
export const otherDriverId = unwrap(createDriverId(uuid(5)));
export const townId = unwrap(createTownId(uuid(6)));
export const otherTownId = unwrap(createTownId(uuid(15)));
export const demoRunId = unwrap(createDemoRunId(uuid(16)));
export const standId = unwrap(createStandId(uuid(7)));
export const offerId = unwrap(createRideOfferId(uuid(8)));
export const tripId = unwrap(createTripId(uuid(9)));
export const otherStandId = unwrap(createStandId(uuid(13)));
export const otherOfferId = unwrap(createRideOfferId(uuid(14)));
export const route = {
  routeId: unwrap(createRouteId(uuid(10))),
  pickupLandmarkId: unwrap(createLandmarkId(uuid(11))),
  destinationLandmarkId: unwrap(createLandmarkId(uuid(12))),
};
export const scope = { townId };
export const dispatchActor = { type: 'dispatch' } as const;
export const driverActor = { type: 'driver', driverId } as const;
export const coordinatorActor = {
  type: 'stand_coordinator',
  coordinatorId: unwrap(createStandCoordinatorId(uuid(17))),
  standId,
} as const;
export const canBook = { canBook: true };
export const cannotBook = { canBook: false };
export const MINUTE_IN_MILLISECONDS = 60_000;
export const DEFAULT_LEAD_IN_MILLISECONDS = 20 * MINUTE_IN_MILLISECONDS;
export const DEFAULT_DISPATCH_IN_MILLISECONDS = 90_000;
export const pickupInMilliseconds = 30 * MINUTE_IN_MILLISECONDS;
export const dueInMilliseconds = pickupInMilliseconds - DEFAULT_LEAD_IN_MILLISECONDS;
export const at = (epochMilliseconds: number) =>
  unwrap(Instant.fromEpochMilliseconds(epochMilliseconds));
const subject = unwrap(createSessionSubject(uuid(101)));
export const otherSubject = unwrap(createSessionSubject(uuid(102)));
const boundAt = at(0);
export const driverSession = {
  subject,
  device: { status: 'active', driverId, subject, boundAt },
} as const;
export const otherDriverSession = {
  subject: otherSubject,
  device: { status: 'active', driverId: otherDriverId, subject: otherSubject, boundAt },
} as const;

export const duration = (milliseconds: number) => unwrap(Duration.fromMilliseconds(milliseconds));
export const money = (paise: number) => unwrap(Money.fromPaise(paise));
export const quote = {
  riderId,
  scope,
  fare: { route, amount: money(8_000), fareChartVersion: 1 },
  expiresAt: at(MINUTE_IN_MILLISECONDS),
};

export const request = {
  bookingId,
  riderId,
  scope,
  standId,
  quote,
  currentFareChartVersion: 1,
  ...canBook,
};
export const schedule = { ...request, pickupAt: at(pickupInMilliseconds) };
export const offer = { offerId, driverId, standId, expiresAt: at(MINUTE_IN_MILLISECONDS) };
export const issue = { offer, ...canBook };
export const reservedEntry = {
  driverId,
  standId,
  availability: 'online',
  queuedAt: 0n,
  reservation: offerId,
} as const;
export const accept = { offerId, tripId, driver: driverSession, entry: reservedEntry, ...canBook };
export const decline = { offerId, actor: driverActor, action: 'decline', ...canBook } as const;
export const expire = { offerId, actor: dispatchActor, action: 'expire', ...canBook } as const;
export const withdraw = {
  offerId,
  actor: coordinatorActor,
  action: 'withdraw',
  ...canBook,
} as const;
export const search = { ...canBook, areStandsExhausted: true };

export const makeScheduled = () => unwrap(Booking.schedule(schedule, at(0))).booking;
export const makeRequested = () => unwrap(Booking.request(request, at(0))).booking;
export const makeOffering = () => unwrap(makeRequested().issueOffer(issue, at(1))).booking;
export const makeAccepted = () => unwrap(makeOffering().acceptOffer(accept, at(2))).booking;
export const makeArrived = () => unwrap(makeAccepted().reportArrival(driverSession, at(3))).booking;
export const makeInTrip = () => unwrap(makeArrived().confirmPickup(driverSession, at(4))).booking;

export const makeBooking = {
  scheduled: makeScheduled,
  requested: makeRequested,
  offering: makeOffering,
  accepted: makeAccepted,
  driver_arrived: makeArrived,
  in_trip: makeInTrip,
  completed: () => unwrap(makeInTrip().completeTrip(driverSession, at(5))).booking,
  cancelled_by_rider: () => unwrap(makeRequested().cancelByRider(riderId, at(5))).booking,
  cancelled_by_driver: () => unwrap(makeAccepted().cancelByDriver(driverSession, at(5))).booking,
  no_driver_found: () => unwrap(makeRequested().endSearch(search, at(5))).booking,
} satisfies Record<BookingStatus, () => Booking>;
