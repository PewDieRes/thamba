import fc from 'fast-check';
import { expect, it } from 'vitest';
import {
  joinDriverQueue,
  leaveDriverQueue,
  releaseDriverQueueEntry,
  reserveDriverQueueEntry,
} from '@domain/dispatch/driver-queue-entry';
import type { DriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import { KeepPositionPolicy } from '@domain/dispatch/keep-position.policy';
import { MoveToBackOfQueuePolicy } from '@domain/dispatch/move-to-back-of-queue.policy';
import { createDriverId } from '@domain/shared/ids.value-object';
import * as f from '../unit/domain/dispatch/booking.fixtures';
import { PROPERTY_RUNS } from './property-runs.fixtures';

const MICROSECONDS_PER_MILLISECOND = 1_000n;
const MAX_CLOCK_ADVANCE_IN_MILLISECONDS = 3;
const RESERVED_QUEUED_AT_MICROSECONDS = 3n * MICROSECONDS_PER_MILLISECOND;
const otherStandEntries: readonly DriverQueueEntry[] = [
  {
    driverId: f.unwrap(createDriverId('71491f82-f23f-4239-b9ad-db42d1cf1416')),
    standId: f.otherStandId,
    availability: 'online',
    queuedAt: 10n * MICROSECONDS_PER_MILLISECOND,
    reservation: f.otherOfferId,
  },
];
const reservedNeighbour: DriverQueueEntry = {
  driverId: f.otherDriverId,
  standId: f.standId,
  availability: 'online',
  queuedAt: RESERVED_QUEUED_AT_MICROSECONDS,
  reservation: f.otherOfferId,
};
const standEntries = [...otherStandEntries, reservedNeighbour];
const offline = { driverId: f.driverId, standId: f.standId, availability: 'offline' } as const;
const moveToBack = new MoveToBackOfQueuePolicy();
const keepPosition = new KeepPositionPolicy();

interface QueueState {
  readonly entry: DriverQueueEntry;
  readonly hasActiveTrip: boolean;
}

const steps = fc.array(
  fc.record({
    action: fc.constantFrom(
      'online',
      'offline',
      'reserve',
      'decline',
      'expire',
      'withdraw',
      'accept',
      'complete',
      'cancel',
    ),
    advancesByMilliseconds: fc.integer({ min: 0, max: MAX_CLOCK_ADVANCE_IN_MILLISECONDS }),
    keepsPosition: fc.boolean(),
  }),
  { minLength: 1, maxLength: 30 },
);

type Step = typeof steps extends fc.Arbitrary<readonly (infer T)[]> ? T : never;

function appendToTail(entry: DriverQueueEntry, nowInMilliseconds: number): bigint {
  const existingQueuedAt = entry.availability === 'online' ? entry.queuedAt : 0n;
  const latestQueuedAt =
    existingQueuedAt > RESERVED_QUEUED_AT_MICROSECONDS
      ? existingQueuedAt
      : RESERVED_QUEUED_AT_MICROSECONDS;
  const nowInMicroseconds = BigInt(nowInMilliseconds) * MICROSECONDS_PER_MILLISECOND;
  return nowInMicroseconds > latestQueuedAt ? nowInMicroseconds : latestQueuedAt + 1n;
}

function checkJoin(state: QueueState, nowInMilliseconds: number): QueueState {
  const { entry, hasActiveTrip } = state;
  const result = joinDriverQueue({
    entry,
    hasActiveTrip,
    now: f.at(nowInMilliseconds),
    standEntries,
  });
  if (hasActiveTrip) {
    expect(result.ok).toBe(false);
    return state;
  }
  const joined = f.unwrap(result);
  const { driverId, standId } = entry;
  expect(joined).toEqual(
    entry.availability === 'online'
      ? entry
      : {
          driverId,
          standId,
          availability: 'online',
          queuedAt: appendToTail(entry, nowInMilliseconds),
        },
  );
  return { ...state, entry: joined };
}

function checkReserve(state: QueueState): QueueState {
  const { entry } = state;
  const result = reserveDriverQueueEntry(entry, f.offerId);
  if (entry.availability !== 'online' || entry.reservation !== undefined) {
    expect(result.ok).toBe(false);
    return state;
  }
  const reserved = f.unwrap(result);
  expect(reserved).toEqual({ ...entry, reservation: f.offerId });
  return { ...state, entry: reserved };
}

function checkRelease(state: QueueState, step: Step, nowInMilliseconds: number): QueueState {
  const { entry } = state;
  const outcome =
    step.action === 'decline' ? 'declined' : step.action === 'expire' ? 'expired' : 'withdrawn';
  const result = releaseDriverQueueEntry({
    entry,
    offerId: f.offerId,
    outcome,
    now: f.at(nowInMilliseconds),
    standEntries: [...standEntries, entry],
    declinePenalty: step.keepsPosition ? keepPosition : moveToBack,
  });
  if (entry.availability !== 'online' || entry.reservation !== f.offerId) {
    expect(result.ok).toBe(false);
    return state;
  }
  const released = f.unwrap(result);
  const { driverId, standId } = entry;
  const movesToTail = outcome === 'expired' || (outcome === 'declined' && !step.keepsPosition);
  expect(released).toEqual({
    driverId,
    standId,
    availability: 'online',
    queuedAt: movesToTail ? appendToTail(entry, nowInMilliseconds) : entry.queuedAt,
  });
  return { ...state, entry: released };
}

function acceptReservation(state: QueueState): QueueState {
  const { entry } = state;
  if (entry.availability !== 'online' || entry.reservation !== f.offerId) return state;
  return { entry: leaveDriverQueue(entry), hasActiveTrip: true };
}

function checkQueueStep(state: QueueState, step: Step, nowInMilliseconds: number): QueueState {
  const { entry } = state;
  switch (step.action) {
    case 'online':
      return checkJoin(state, nowInMilliseconds);
    case 'reserve':
      return checkReserve(state);
    case 'decline':
    case 'expire':
    case 'withdraw':
      return checkRelease(state, step, nowInMilliseconds);
    case 'offline':
      return { ...state, entry: leaveDriverQueue(entry) };
    case 'accept':
      return acceptReservation(state);
    case 'complete':
    case 'cancel':
      return { ...state, hasActiveTrip: false };
  }
}

it('I9 preserves queue position and exclusive reservations through generated rotation changes', () => {
  fc.assert(
    fc.property(steps, (commands) => {
      let state: QueueState = { entry: offline, hasActiveTrip: false };
      let nowInMilliseconds = 0;
      for (const step of commands) {
        nowInMilliseconds += step.advancesByMilliseconds;
        state = checkQueueStep(state, step, nowInMilliseconds);
        if (
          state.hasActiveTrip ||
          step.action === 'offline' ||
          state.entry.availability === 'offline'
        ) {
          expect(state.entry).toEqual(offline);
        }
      }
    }),
    { numRuns: PROPERTY_RUNS },
  );
});
