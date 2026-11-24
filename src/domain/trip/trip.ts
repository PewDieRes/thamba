import type { BookingFare } from '../dispatch/booking-terms';
import { getBoundDriverId } from '../identity/driver-device';
import type { DriverSession, DriverSessionError } from '../identity/driver-device';
import type { DomainError } from '../shared/domain.error';
import type { BookingId, RiderId } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import { err, ok } from '../shared/result';
import type { Result } from '../shared/result';
import type { BookingScope } from '../town/town';
import type {
  TripActor,
  TripCancellationReason,
  TripCreated,
  TripEventContext,
  TripProgressEvent,
  TripReference,
} from './trip-events';

interface TripAssignment extends BookingScope, TripReference {
  readonly bookingId: BookingId;
  readonly riderId: RiderId;
  readonly fare: BookingFare;
}

interface TripDetails extends TripAssignment {
  readonly acceptedAt: Instant;
  readonly arrivedAt?: Instant;
  readonly pickedUpAt?: Instant;
}

export const TRIP_TRANSITIONS = {
  accepted: {
    reportArrival: 'driver_arrived',
    cancelByRider: 'cancelled_by_rider',
    cancelByDriver: 'cancelled_by_driver',
  },
  driver_arrived: {
    confirmPickup: 'in_trip',
    cancelByRider: 'cancelled_by_rider',
    cancelByDriver: 'cancelled_by_driver',
  },
  in_trip: {
    completeTrip: 'completed',
    cancelByRider: 'cancelled_by_rider',
    cancelByDriver: 'cancelled_by_driver',
  },
} as const;

type ActiveTripStatus = keyof typeof TRIP_TRANSITIONS;
type NextTripStatus = {
  [
    Status in ActiveTripStatus
  ]: (typeof TRIP_TRANSITIONS)[Status][keyof (typeof TRIP_TRANSITIONS)[Status]];
}[ActiveTripStatus];
export type ActiveTrip = TripDetails & { readonly status: ActiveTripStatus };
type EndedTrip = TripDetails & { readonly endedAt: Instant } & (
    | { readonly status: 'completed' }
    | { readonly status: TripCancellationReason; readonly reason: TripCancellationReason }
  );

export type Trip = ActiveTrip | EndedTrip;

type DriverTripAction = 'reportArrival' | 'confirmPickup' | 'completeTrip' | 'cancelByDriver';
export type TripCommand =
  | { readonly type: DriverTripAction; readonly driver: DriverSession }
  | { readonly type: 'cancelByRider'; readonly riderId: RiderId };

type TripTransitionError =
  DomainError<'illegal_transition' | 'driver_mismatch' | 'rider_mismatch'> | DriverSessionError;

interface TripTransition {
  readonly trip: Trip;
  readonly event: TripProgressEvent;
}

export function createTrip(
  assignment: TripAssignment,
  now: Instant,
): {
  readonly trip: ActiveTrip;
  readonly event: TripCreated;
} {
  const { bookingId, riderId, driverId, standId, tripId, townId, demoRunId, fare } = assignment;
  const trip: ActiveTrip = Object.freeze({
    bookingId,
    riderId,
    driverId,
    standId,
    tripId,
    townId,
    fare,
    ...(demoRunId === undefined ? {} : { demoRunId }),
    acceptedAt: now,
    status: 'accepted',
  });
  const actor = { type: 'driver', driverId } as const;
  return { trip, event: { ...getTripEventContext(trip, actor, now), type: 'TripCreated', fare } };
}

const transitions: Readonly<
  Record<ActiveTripStatus, Readonly<Partial<Record<TripCommand['type'], NextTripStatus>>>>
> = TRIP_TRANSITIONS;

export function isActiveTrip(trip: Trip): trip is ActiveTrip {
  return trip.status in TRIP_TRANSITIONS;
}

export function transitionTrip(
  trip: Trip,
  command: TripCommand,
  now: Instant,
): Result<TripTransition, TripTransitionError> {
  if (!isActiveTrip(trip)) return err({ code: 'illegal_transition' });
  const status = transitions[trip.status][command.type];
  if (status === undefined) return err({ code: 'illegal_transition' });

  const actor = authorizeTripActor(trip, command);
  if (!actor.ok) return actor;
  const context = getTripEventContext(trip, actor.value, now);
  return ok(recordTripTransition(trip, status, context));
}

function authorizeTripActor(
  trip: Trip,
  command: TripCommand,
): Result<TripActor, TripTransitionError> {
  if (command.type === 'cancelByRider') {
    if (command.riderId !== trip.riderId) return err({ code: 'rider_mismatch' });
    return ok({ type: 'rider', riderId: command.riderId });
  }
  const driver = getBoundDriverId(command.driver);
  if (!driver.ok) return driver;
  if (driver.value !== trip.driverId) return err({ code: 'driver_mismatch' });
  return ok({ type: 'driver', driverId: driver.value });
}

function recordTripTransition(
  trip: ActiveTrip,
  status: NextTripStatus,
  context: TripEventContext,
): TripTransition {
  const now = context.occurredAt;
  switch (status) {
    case 'driver_arrived':
      return {
        trip: Object.freeze({ ...trip, status, arrivedAt: now }),
        event: { ...context, type: 'DriverArrived' },
      };
    case 'in_trip':
      return {
        trip: Object.freeze({ ...trip, status, pickedUpAt: now }),
        event: { ...context, type: 'TripStarted' },
      };
    case 'completed':
      return {
        trip: Object.freeze({ ...trip, status, endedAt: now }),
        event: { ...context, type: 'TripCompleted' },
      };
    case 'cancelled_by_rider':
    case 'cancelled_by_driver':
      return {
        trip: Object.freeze({ ...trip, status, endedAt: now, reason: status }),
        event: { ...context, type: 'TripCancelled', reason: status },
      };
  }
}

function getTripEventContext(trip: Trip, actor: TripActor, now: Instant): TripEventContext {
  const { tripId, bookingId, driverId, standId, townId, demoRunId } = trip;
  return {
    tripId,
    bookingId,
    driverId,
    standId,
    townId,
    ...(demoRunId === undefined ? {} : { demoRunId }),
    actor,
    occurredAt: now,
  };
}
