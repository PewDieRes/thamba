import type { AvailabilityReason } from '../ports/event-log';
import type { Booking } from '@domain/dispatch/booking';
import type { DeclinePenaltyPolicy } from '@domain/dispatch/decline-penalty.policy';
import { leaveDriverQueue, releaseDriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import type { Instant } from '@domain/shared/instant.value-object';
import { err, ok } from '@domain/shared/result';
import type { ApplicationResult } from '../ports/application-result';
import type { IdGenerator } from '../ports/id-generator';
import type { RecordedRideOffer } from '../ports/ride-offer-repository';
import type { Transaction } from '../ports/unit-of-work';
import type { Versioned } from '../ports/versioned';
import { sameScope } from './booking-authority';
import type { BookingChange } from './save-booking-decision';
import { saveBookingDecision, saveQueueChange } from './save-booking-decision';

const outcomes = {
  RideOfferAccepted: 'accepted',
  RideOfferDeclined: 'declined',
  RideOfferExpired: 'expired',
  RideOfferWithdrawn: 'withdrawn',
} as const;

interface OfferResolution {
  readonly before: Versioned<Booking>;
  readonly decision: BookingChange;
  readonly now: Instant;
  readonly ids: IdGenerator;
  readonly declinePenalty: DeclinePenaltyPolicy;
  readonly takeOffline?: boolean;
  readonly availabilityReason?: AvailabilityReason | undefined;
}

export async function saveOfferResolution(
  tx: Transaction,
  options: OfferResolution,
): Promise<ApplicationResult<void>> {
  const { before, decision, now, ids, declinePenalty, takeOffline, availabilityReason } = options;
  const resolution = await readResolution(tx, before.value, decision);
  if (!resolution.ok) return resolution;
  const { event, outcome, offer, queue } = resolution.value;
  const entry = queue.value.entry;
  const updated =
    outcome === 'accepted'
      ? { ok: true as const, value: leaveDriverQueue(entry) }
      : releaseDriverQueueEntry({
          entry,
          offerId: offer.value.offer.offerId,
          outcome,
          now,
          declinePenalty,
          standEntries: (await tx.drivers.listForStands(queue.value, [entry.standId])).map(
            ({ value }) => value.entry,
          ),
        });
  if (!updated.ok) return err({ code: 'driver_not_reserved' });
  const savedOffer = await tx.offers.save({ ...offer.value, status: outcome }, offer.version);
  if (!savedOffer.ok) return savedOffer;
  const savedBooking = await saveBookingDecision(tx, decision, {
    ids,
    expectedVersion: before.version,
  });
  if (!savedBooking.ok) return savedBooking;
  return saveQueueChange(tx, ids, {
    previous: queue,
    entry: takeOffline ? leaveDriverQueue(updated.value) : updated.value,
    actor: event.actor,
    now,
    reason: outcome,
    availabilityReason,
    bookingId: before.value.state.bookingId,
  });
}

async function readResolution(tx: Transaction, booking: Booking, decision: BookingChange) {
  const pending = booking.state.offer;
  const event = decision.events.find((event) => event.type in outcomes);
  if (!pending || !event) return err({ code: 'inconsistent_state' as const });
  const outcome = outcomes[event.type as keyof typeof outcomes];
  const offer = await tx.offers.get(pending.offerId);
  const queue = await tx.drivers.get(pending.driverId);
  if (!offer || !queue || !matchesReservation(offer.value, booking, queue.value)) {
    return err({ code: 'inconsistent_state' as const });
  }
  return ok({ event, outcome, offer, queue });
}

function matchesReservation(
  offer: RecordedRideOffer,
  { state }: Booking,
  queue: NonNullable<Awaited<ReturnType<Transaction['drivers']['get']>>>['value'],
): boolean {
  const { entry } = queue;
  return (
    offer.status === 'pending' &&
    offer.offer.bookingId === state.bookingId &&
    sameScope(offer, state) &&
    sameScope(queue, state) &&
    entry.standId === offer.offer.standId &&
    entry.availability === 'online' &&
    entry.reservation === offer.offer.offerId
  );
}
