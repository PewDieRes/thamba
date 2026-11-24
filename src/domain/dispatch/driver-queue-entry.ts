import type { DomainError } from '../shared/domain.error';
import type { DriverId, RideOfferId, StandId } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import { err, ok } from '../shared/result';
import type { Result } from '../shared/result';
import type { DeclinePenaltyPolicy } from './decline-penalty.policy';

const MICROSECONDS_PER_MILLISECOND = 1_000n;
const QUEUE_STEP_MICROSECONDS = 1n;

interface DriverQueueIdentity {
  readonly driverId: DriverId;
  readonly standId: StandId;
}

export interface OnlineDriverQueueEntry extends DriverQueueIdentity {
  readonly availability: 'online';
  readonly queuedAt: bigint;
  readonly reservation?: RideOfferId;
}

interface OfflineDriverQueueEntry extends DriverQueueIdentity {
  readonly availability: 'offline';
}

export type DriverQueueEntry = OnlineDriverQueueEntry | OfflineDriverQueueEntry;

type QueueEntryError = DomainError<'driver_not_available' | 'driver_not_reserved'>;

interface TailInput {
  readonly standId: StandId;
  readonly entries: readonly DriverQueueEntry[];
  readonly now: Instant;
}

export function getTailQueuedAt({ standId, entries, now }: TailInput): bigint {
  let queuedAt = BigInt(now.epochMilliseconds) * MICROSECONDS_PER_MILLISECOND;
  for (const entry of entries) {
    if (
      entry.standId === standId &&
      entry.availability === 'online' &&
      entry.queuedAt >= queuedAt
    ) {
      queuedAt = entry.queuedAt + QUEUE_STEP_MICROSECONDS;
    }
  }
  return queuedAt;
}

interface QueueChangeInput {
  readonly entry: DriverQueueEntry;
  readonly now: Instant;
  readonly standEntries: readonly DriverQueueEntry[];
}

interface JoinQueueInput extends QueueChangeInput {
  readonly hasActiveTrip: boolean;
}

export function joinDriverQueue(
  input: JoinQueueInput,
): Result<OnlineDriverQueueEntry, QueueEntryError> {
  const { entry, now, standEntries, hasActiveTrip } = input;
  if (hasActiveTrip) return err({ code: 'driver_not_available' });
  if (entry.availability === 'online') return ok(entry);

  const { driverId, standId } = entry;
  const queuedAt = getTailQueuedAt({ standId, entries: standEntries, now });
  return ok(Object.freeze({ driverId, standId, availability: 'online', queuedAt }));
}

export function reserveDriverQueueEntry(
  entry: DriverQueueEntry,
  offerId: RideOfferId,
): Result<OnlineDriverQueueEntry, QueueEntryError> {
  if (entry.availability !== 'online' || entry.reservation !== undefined) {
    return err({ code: 'driver_not_available' });
  }
  return ok(Object.freeze({ ...entry, reservation: offerId }));
}

interface ReleaseQueueInput extends QueueChangeInput {
  readonly offerId: RideOfferId;
  readonly outcome: 'declined' | 'expired' | 'withdrawn';
  readonly declinePenalty?: DeclinePenaltyPolicy;
}

export function releaseDriverQueueEntry(
  input: ReleaseQueueInput,
): Result<OnlineDriverQueueEntry, QueueEntryError> {
  const { entry, offerId, outcome, now, standEntries, declinePenalty } = input;
  if (entry.availability !== 'online' || entry.reservation !== offerId) {
    return err({ code: 'driver_not_reserved' });
  }

  const { driverId, standId } = entry;
  let queuedAt = entry.queuedAt;
  if (outcome !== 'withdrawn') {
    const tailQueuedAt = getTailQueuedAt({ standId, entries: standEntries, now });
    const proposedQueuedAt =
      outcome === 'declined' && declinePenalty !== undefined
        ? declinePenalty.getQueuedAt({ queuedAt, tailQueuedAt })
        : tailQueuedAt;
    queuedAt =
      proposedQueuedAt < queuedAt || proposedQueuedAt > tailQueuedAt
        ? tailQueuedAt
        : proposedQueuedAt;
  }
  return ok(Object.freeze({ driverId, standId, availability: 'online', queuedAt }));
}

export function leaveDriverQueue({ driverId, standId }: DriverQueueEntry): OfflineDriverQueueEntry {
  return Object.freeze({ driverId, standId, availability: 'offline' });
}
