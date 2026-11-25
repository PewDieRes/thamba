import type { AvailabilityReason } from '../ports/event-log';
import type { DriverActor, StandCoordinatorActor } from '@domain/dispatch/booking-events';
import { getDispatchBlock } from '@domain/dispatch/booking-request';
import type { DeclinePenaltyPolicy } from '@domain/dispatch/decline-penalty.policy';
import type { DriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import { joinDriverQueue, leaveDriverQueue } from '@domain/dispatch/driver-queue-entry';
import type { DriverId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import { err } from '@domain/shared/result';
import type { ScopedQueueEntry } from '../ports/driver-queue-repository';
import type { IdGenerator } from '../ports/id-generator';
import type { Transaction } from '../ports/unit-of-work';
import type { Versioned } from '../ports/versioned';
import { canBookTown, sameScope } from './booking-authority';
import { commit, type CommandDecision } from './execute-command';
import { saveQueueChange } from './save-booking-decision';
import { saveOfferResolution } from './save-offer-resolution';

interface AvailabilityChange {
  readonly actor: DriverActor | StandCoordinatorActor;
  readonly driverId: DriverId;
  readonly isOnline: boolean;
  readonly reason?: AvailabilityReason | undefined;
}

interface AvailabilityOptions {
  readonly now: Instant;
  readonly ids: IdGenerator;
  readonly declinePenalty: DeclinePenaltyPolicy;
}

export async function setAvailability(
  tx: Transaction,
  change: AvailabilityChange,
  options: AvailabilityOptions,
): Promise<CommandDecision<DriverQueueEntry>> {
  const { driverId, actor, isOnline, reason } = change;
  const current = await tx.drivers.get(driverId);
  if (!current || !ownsQueueEntry(actor, current.value)) return err({ code: 'not_found' as const });
  if (isOnline) return joinRotation(tx, current, { ...options, actor });
  if (actor.type === 'stand_coordinator' && reason === undefined)
    return err({ code: 'invalid_input' as const });
  return leaveRotation(tx, current, { ...options, actor, reason });
}

async function leaveRotation(
  tx: Transaction,
  current: Versioned<ScopedQueueEntry>,
  {
    actor,
    reason,
    now,
    ids,
    declinePenalty,
  }: AvailabilityOptions & Pick<AvailabilityChange, 'actor' | 'reason'>,
) {
  const { entry } = current.value;
  if (entry.availability === 'offline') return commit(leaveDriverQueue(entry));
  if (entry.reservation)
    return withdrawFromOffer(tx, current, { now, ids, declinePenalty, actor, reason });
  const updated = leaveDriverQueue(entry);
  const saved = await saveQueueChange(tx, ids, {
    previous: current,
    entry: updated,
    actor,
    now,
    reason: reason ?? 'offline',
  });
  return saved.ok ? commit(updated) : saved;
}

function ownsQueueEntry(actor: AvailabilityChange['actor'], { entry }: ScopedQueueEntry): boolean {
  return actor.type === 'driver'
    ? actor.driverId === entry.driverId
    : actor.standId === entry.standId;
}

async function joinRotation(
  tx: Transaction,
  current: Versioned<ScopedQueueEntry>,
  { actor, ids, now }: AvailabilityOptions & Pick<AvailabilityChange, 'actor'>,
) {
  const { entry } = current.value;
  if (await tx.trips.findActiveByDriver(entry.driverId))
    return err({ code: 'driver_on_trip' as const });
  if (entry.availability === 'online') return commit(entry);
  if (await tx.offers.findPendingByDriver(entry.driverId))
    return err({ code: 'driver_slot_occupied' as const });
  const standEntries = await tx.drivers.listForStands(current.value, [entry.standId]);
  const updated = joinDriverQueue({
    entry,
    hasActiveTrip: false,
    now,
    standEntries: standEntries.map(({ value }) => value.entry),
  });
  if (!updated.ok) return err({ code: 'driver_slot_occupied' as const });
  const saved = await saveQueueChange(tx, ids, {
    previous: current,
    entry: updated.value,
    actor,
    now,
    reason: 'available',
  });
  return saved.ok ? commit(updated.value) : saved;
}

async function withdrawFromOffer(
  tx: Transaction,
  current: Versioned<ScopedQueueEntry>,
  options: AvailabilityOptions & Pick<AvailabilityChange, 'actor' | 'reason'>,
) {
  const { now, actor } = options;
  const { entry } = current.value;
  const offer = await tx.offers.findPendingByDriver(entry.driverId);
  if (!offer || !sameScope(offer.value, current.value))
    return err({ code: 'inconsistent_state' as const });
  const booking = await tx.bookings.get(offer.value.offer.bookingId);
  if (!booking) return err({ code: 'inconsistent_state' as const });
  const town = (await tx.towns.get(current.value.townId))?.value;
  const canBook = canBookTown(town, booking.value.state, now);
  const decision = getDispatchBlock(booking.value.state, { canBook }, now)
    ? booking.value.endOffering({ canBook, actor }, now)
    : booking.value.closeOffer(
        { action: 'withdraw', actor, canBook, offerId: offer.value.offer.offerId },
        now,
      );
  if (!decision.ok) return decision;
  const saved = await saveOfferResolution(tx, {
    ...options,
    before: booking,
    decision: decision.value,
    takeOffline: true,
    availabilityReason: options.reason,
  });
  return saved.ok ? commit(leaveDriverQueue(entry)) : saved;
}
