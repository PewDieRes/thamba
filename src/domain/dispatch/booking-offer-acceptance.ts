import { getBoundDriverId } from '../identity/driver-device';
import type { DriverSession } from '../identity/driver-device';
import type { RideOfferId, TripId } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import { err, ok } from '../shared/result';
import { createTrip } from '../trip/trip';
import type { BookingDecision } from './booking-decision';
import { getBookingEventContext } from './booking-events';
import { getDispatchBlock } from './booking-request';
import type { BookingAuthority } from './booking-request';
import type { BookingState, PendingBookingOffer } from './booking-state';
import { leaveDriverQueue } from './driver-queue-entry';
import type { DriverQueueEntry } from './driver-queue-entry';
import { isRideOfferExpired } from './ride-offer';

export interface AcceptOfferInput extends BookingAuthority {
  readonly offerId: RideOfferId;
  readonly driver: DriverSession;
  readonly entry: DriverQueueEntry;
  readonly tripId: TripId;
}

export function acceptBookingOffer(
  state: BookingState,
  input: AcceptOfferInput,
  now: Instant,
): BookingDecision {
  const offer = state.offer;
  if (offer?.offerId !== input.offerId) return err({ code: 'offer_mismatch' });
  const driver = getBoundDriverId(input.driver);
  if (!driver.ok) return driver;
  if (offer.driverId !== driver.value) return err({ code: 'driver_mismatch' });
  if (isRideOfferExpired(offer, now)) return err({ code: 'offer_expired' });

  const block = getDispatchBlock(state, input, now);
  if (block) return err({ code: block });
  if (!hasOfferReservation(input.entry, offer)) return err({ code: 'driver_not_reserved' });

  const { offerId, driverId, standId } = offer;
  const { bookingId, riderId, townId, demoRunId, fare } = state;
  const tripReference = { tripId: input.tripId, driverId, standId };
  const { trip, event } = createTrip(
    {
      ...tripReference,
      bookingId,
      riderId,
      townId,
      fare,
      ...(demoRunId === undefined ? {} : { demoRunId }),
    },
    now,
  );
  const context = getBookingEventContext(state, { type: 'driver', driverId }, now);
  return ok({
    changes: { offer: undefined },
    trip,
    queueEntry: leaveDriverQueue(input.entry),
    events: [
      { ...context, offerId, driverId, standId, type: 'RideOfferAccepted' },
      { ...context, ...tripReference, type: 'BookingAccepted' },
      event,
    ],
  });
}

function hasOfferReservation(entry: DriverQueueEntry, offer: PendingBookingOffer): boolean {
  return (
    entry.availability === 'online' &&
    entry.driverId === offer.driverId &&
    entry.standId === offer.standId &&
    entry.reservation === offer.offerId
  );
}
