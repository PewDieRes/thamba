import type { RiderId } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import { err, ok } from '../shared/result';
import { transitionTrip } from '../trip/trip';
import type { TripCommand } from '../trip/trip';
import type { BookingDecision } from './booking-decision';
import { getBookingEventContext } from './booking-events';
import type { BookingEvent } from './booking-events';
import { getOfferCloseEvent } from './booking-offer-transition';
import type { BookingState } from './booking-state';

export function recordBookingTripTransition(
  state: BookingState,
  command: TripCommand,
  now: Instant,
): BookingDecision {
  if (state.trip === undefined) return err({ code: 'illegal_transition' });
  const result = transitionTrip(state.trip, command, now);
  if (!result.ok) return result;

  const { trip, event } = result.value;
  const events: BookingEvent[] = [event];
  const context = getBookingEventContext(state, event.actor, now);
  if (command.type === 'cancelByRider')
    events.push({ ...context, type: 'BookingCancelledByRider' });
  if (command.type === 'cancelByDriver') {
    const { tripId, driverId, standId } = trip;
    events.push({ ...context, tripId, driverId, standId, type: 'BookingCancelledByDriver' });
  }
  return ok({ changes: {}, trip, events });
}

export function cancelBookingByRider(
  state: BookingState,
  riderId: RiderId,
  now: Instant,
): BookingDecision {
  if (state.riderId !== riderId) return err({ code: 'rider_mismatch' });
  if (state.trip)
    return recordBookingTripTransition(state, { type: 'cancelByRider', riderId }, now);

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
  events.push({ ...context, type: 'BookingCancelledByRider' });
  return ok({ changes: { offer: undefined }, events });
}
