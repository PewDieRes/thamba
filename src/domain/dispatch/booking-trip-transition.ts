import type { DriverId, RiderId } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import { err, ok } from '../shared/result';
import type { BookingDecision } from './booking-decision';
import { getBookingEventContext } from './booking-events';
import type { BookingEvent, TripCancelled } from './booking-events';
import { getOfferCloseEvent } from './booking-offer-transition';
import type { BookingState, BookingTrip } from './booking-state';

interface TripProgress {
  readonly driverId: DriverId;
  readonly type: 'DriverArrived' | 'TripStarted' | 'TripCompleted';
}

export function recordTripProgress(
  state: BookingState,
  progress: TripProgress,
  now: Instant,
): BookingDecision {
  const { driverId, type } = progress;
  const trip = state.trip;
  if (trip?.driverId !== driverId) return err({ code: 'driver_mismatch' });

  const context = getBookingEventContext(state, { type: 'driver', driverId }, now);
  const { tripId, standId } = trip;
  return ok({
    changes: { trip: updateTrip(trip, type, now) },
    events: [{ ...context, tripId, driverId, standId, type }],
  });
}

function updateTrip(
  trip: BookingTrip,
  type: TripProgress['type'],
  now: Instant,
): BookingTrip | undefined {
  if (type === 'DriverArrived') return Object.freeze({ ...trip, arrivedAt: now });
  if (type === 'TripStarted') return Object.freeze({ ...trip, pickedUpAt: now });
  return undefined;
}

export function cancelBookingByRider(
  state: BookingState,
  riderId: RiderId,
  now: Instant,
): BookingDecision {
  if (state.riderId !== riderId) return err({ code: 'rider_mismatch' });

  const context = getBookingEventContext(state, { type: 'rider', riderId }, now);
  const events: BookingEvent[] = [];
  if (state.offer) {
    events.push(
      getOfferCloseEvent(
        state,
        {
          offer: state.offer,
          actor: context.actor,
          type: 'RideOfferWithdrawn',
          reason: 'rider_cancelled',
        },
        now,
      ),
    );
  }
  if (state.trip) events.push(getTripCancelled(context, state.trip, 'cancelled_by_rider'));
  events.push({ ...context, type: 'BookingCancelledByRider' });
  return ok({ changes: { offer: undefined, trip: undefined }, events });
}

export function cancelBookingByDriver(
  state: BookingState,
  driverId: DriverId,
  now: Instant,
): BookingDecision {
  const trip = state.trip;
  if (trip?.driverId !== driverId) return err({ code: 'driver_mismatch' });

  const context = getBookingEventContext(state, { type: 'driver', driverId }, now);
  const { tripId, standId } = trip;
  return ok({
    changes: { trip: undefined },
    events: [
      getTripCancelled(context, trip, 'cancelled_by_driver'),
      { ...context, tripId, driverId, standId, type: 'BookingCancelledByDriver' },
    ],
  });
}

function getTripCancelled(
  context: ReturnType<typeof getBookingEventContext>,
  { tripId, driverId, standId }: BookingTrip,
  reason: TripCancelled['reason'],
): TripCancelled {
  return { ...context, tripId, driverId, standId, type: 'TripCancelled', reason };
}
