import type { Booking } from '@domain/dispatch/booking';
import { DISPATCH_ACTOR } from '@domain/dispatch/booking-events';
import type { DispatchStep } from '@domain/dispatch/dispatch-planner';
import { reserveDriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import { RideOffer } from '@domain/dispatch/ride-offer';
import type { DriverId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import { err, ok } from '@domain/shared/result';
import type { IdGenerator } from '../ports/id-generator';
import type { TownRecord } from '../ports/town-repository';
import type { Transaction } from '../ports/unit-of-work';
import type { Versioned } from '../ports/versioned';
import { getScope, sameScope } from './booking-authority';
import { mapBookingProgress } from './booking.mapper';
import { commit } from './execute-command';
import { saveQueueChange } from './save-booking-decision';

interface Allocation {
  readonly current: Versioned<Booking>;
  readonly selection: Extract<DispatchStep, { type: 'offer_to' | 'escalate_to_stand' }>;
  readonly eligibleDriverIds: readonly DriverId[];
  readonly town: TownRecord | undefined;
  readonly now: Instant;
  readonly ids: IdGenerator;
}

export async function allocateRideOffer(tx: Transaction, options: Allocation) {
  const { current, now, ids } = options;
  const { state } = current.value;
  const prepared = await prepareOffer(tx, options);
  if (!prepared.ok) return prepared;
  const { queue, reserved, offer } = prepared.value;
  const { driverId } = offer;
  const decision = current.value.issueOffer({ offer, canBook: true }, now);
  if (!decision.ok) return decision;

  const savedOffer = await tx.offers.save({ ...getScope(state), offer, status: 'pending' }, null);
  if (!savedOffer.ok) return savedOffer;
  const savedBooking = await tx.bookings.save(decision.value.booking, current.version);
  if (!savedBooking.ok) return savedBooking;
  const eventId = ids.next<'Event'>();
  const recorded = await recordAllocation(tx, options, {
    queue,
    entry: reserved,
    events: decision.value.events,
    eventId,
  });
  if (!recorded.ok) return recorded;
  return commit(mapBookingProgress(decision.value.booking), { driverId, eventId });
}

async function prepareOffer(tx: Transaction, { current, selection, town, now, ids }: Allocation) {
  const { state } = current.value;
  if (!state.dispatchDeadline) return err({ code: 'inconsistent_state' as const });
  const standId = selection.type === 'offer_to' ? state.standId : selection.standId;
  const driverId = selection.driverId;
  const queue = await tx.drivers.get(driverId);
  if (!queue || queue.value.entry.standId !== standId || !sameScope(queue.value, state)) {
    return err({ code: 'ConcurrencyConflict' as const });
  }
  const offer = RideOffer.issue({
    offerId: ids.next<'RideOffer'>(),
    bookingId: state.bookingId,
    driverId,
    standId,
    now,
    dispatchDeadline: state.dispatchDeadline,
    ...(town?.offerTimeout === undefined ? {} : { offerTimeout: town.offerTimeout }),
  });
  if (!offer.ok) return offer;
  const reserved = reserveDriverQueueEntry(queue.value.entry, offer.value.offerId);
  return reserved.ok
    ? ok({ offer: offer.value, queue, reserved: reserved.value })
    : err({ code: 'ConcurrencyConflict' as const });
}

async function recordAllocation(
  tx: Transaction,
  { now, ids, current, eligibleDriverIds }: Allocation,
  {
    queue,
    entry,
    events,
    eventId,
  }: {
    queue: NonNullable<Awaited<ReturnType<Transaction['drivers']['get']>>>;
    entry: Extract<typeof queue.value.entry, { availability: 'online' }>;
    events: ReadonlyArray<import('@domain/dispatch/booking-events').BookingEvent>;
    eventId: import('@domain/shared/ids.value-object').EventId;
  },
) {
  const created = events.find((event) => event.type === 'RideOfferCreated');
  if (!created) return err({ code: 'inconsistent_state' as const });
  const event = await tx.events.append({ eventId, event: created });
  if (!event.ok) return event;
  return saveQueueChange(tx, ids, {
    previous: queue,
    entry,
    reason: 'reserved',
    actor: DISPATCH_ACTOR,
    now,
    bookingId: current.value.state.bookingId,
    eligibleDriverIds,
  });
}
