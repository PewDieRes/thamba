import type {
  BookingId,
  DriverId,
  RiderId,
  RideOfferId,
  StandCoordinatorId,
  StandId,
} from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import type { BookingScope } from '../town/town';
import type { TripCreated, TripProgressEvent, TripReference } from '../trip/trip-events';
import type { NoDriverFoundReason } from './booking-state';

export type RiderActor = { readonly type: 'rider'; readonly riderId: RiderId };
export type DriverActor = { readonly type: 'driver'; readonly driverId: DriverId };
export type StandCoordinatorActor = {
  readonly type: 'stand_coordinator';
  readonly coordinatorId: StandCoordinatorId;
  readonly standId: StandId;
};
export type DispatchActor = { readonly type: 'dispatch' };
export type BookingActor = RiderActor | DriverActor | StandCoordinatorActor | DispatchActor;

export const DISPATCH_ACTOR: DispatchActor = Object.freeze({ type: 'dispatch' });

interface BookingEventContext extends BookingScope {
  readonly bookingId: BookingId;
  readonly actor: BookingActor;
  readonly occurredAt: Instant;
}

type RecordedEvent<Type extends string> = BookingEventContext & { readonly type: Type };

interface OfferReference {
  readonly offerId: RideOfferId;
  readonly driverId: DriverId;
  readonly standId: StandId;
}

export type BookingScheduled = RecordedEvent<'BookingScheduled'> & {
  readonly pickupAt: Instant;
  readonly requestDueAt: Instant;
};
export type BookingRequested = RecordedEvent<'BookingRequested'>;
export type BookingNoDriverFound = RecordedEvent<'BookingNoDriverFound'> & {
  readonly reason: NoDriverFoundReason;
};
export type RideOfferCreated = RecordedEvent<'RideOfferCreated'> &
  OfferReference & {
    readonly expiresAt: Instant;
  };
export type RideOfferDeclined = RecordedEvent<'RideOfferDeclined'> & OfferReference;
export type RideOfferExpired = RecordedEvent<'RideOfferExpired'> & OfferReference;
export type RideOfferWithdrawn = RecordedEvent<'RideOfferWithdrawn'> &
  OfferReference & {
    readonly reason: 'driver_unavailable' | 'booking_unavailable' | 'rider_cancelled';
  };
export type RideOfferAccepted = RecordedEvent<'RideOfferAccepted'> & OfferReference;
export type BookingAccepted = RecordedEvent<'BookingAccepted'> & TripReference;
export type BookingCancelledByRider = RecordedEvent<'BookingCancelledByRider'>;
export type BookingCancelledByDriver = RecordedEvent<'BookingCancelledByDriver'> & TripReference;

export type BookingEvent =
  | BookingScheduled
  | BookingRequested
  | BookingNoDriverFound
  | RideOfferCreated
  | RideOfferDeclined
  | RideOfferExpired
  | RideOfferWithdrawn
  | RideOfferAccepted
  | BookingAccepted
  | TripCreated
  | TripProgressEvent
  | BookingCancelledByRider
  | BookingCancelledByDriver;

export function getBookingEventContext(
  booking: BookingScope & { readonly bookingId: BookingId },
  actor: BookingActor,
  now: Instant,
): BookingEventContext {
  return {
    bookingId: booking.bookingId,
    townId: booking.townId,
    ...(booking.demoRunId === undefined ? {} : { demoRunId: booking.demoRunId }),
    actor: getEventActor(actor),
    occurredAt: now,
  };
}

function getEventActor(actor: BookingActor): BookingActor {
  switch (actor.type) {
    case 'dispatch':
      return DISPATCH_ACTOR;
    case 'rider':
      return Object.freeze({ type: actor.type, riderId: actor.riderId });
    case 'driver':
      return Object.freeze({ type: actor.type, driverId: actor.driverId });
    case 'stand_coordinator':
      return Object.freeze({
        type: actor.type,
        coordinatorId: actor.coordinatorId,
        standId: actor.standId,
      });
  }
}
