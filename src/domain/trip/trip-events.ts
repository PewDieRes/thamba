import type { BookingFare } from '../dispatch/booking-terms';
import type { BookingId, DriverId, RiderId, StandId, TripId } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import type { BookingScope } from '../town/town';

export type TripCancellationReason = 'cancelled_by_rider' | 'cancelled_by_driver';

export type TripActor =
  | { readonly type: 'driver'; readonly driverId: DriverId }
  | { readonly type: 'rider'; readonly riderId: RiderId };

export interface TripReference {
  readonly tripId: TripId;
  readonly driverId: DriverId;
  readonly standId: StandId;
}

export interface TripEventContext extends BookingScope, TripReference {
  readonly bookingId: BookingId;
  readonly actor: TripActor;
  readonly occurredAt: Instant;
}

export type TripCreated = TripEventContext & {
  readonly type: 'TripCreated';
  readonly fare: BookingFare;
};
export type DriverArrived = TripEventContext & { readonly type: 'DriverArrived' };
export type TripStarted = TripEventContext & { readonly type: 'TripStarted' };
export type TripCompleted = TripEventContext & { readonly type: 'TripCompleted' };
export type TripCancelled = TripEventContext & {
  readonly type: 'TripCancelled';
  readonly reason: TripCancellationReason;
};

export type TripProgressEvent = DriverArrived | TripStarted | TripCompleted | TripCancelled;
