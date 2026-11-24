import fc from 'fast-check';
import { assert, expect, it } from 'vitest';
import { FairRotationPolicy } from '@domain/dispatch/fair-rotation.policy';
import {
  releaseDriverQueueEntry,
  reserveDriverQueueEntry,
} from '@domain/dispatch/driver-queue-entry';
import type { OnlineDriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import { createDriverId } from '@domain/shared/ids.value-object';
import * as f from '../unit/domain/dispatch/booking.fixtures';
import { PROPERTY_RUNS } from './property-runs.fixtures';

const MAX_DRIVERS = 8;
const MAX_ROUNDS = 20;
const MAX_INITIAL_QUEUE_TIME_IN_MICROSECONDS = 5n;
const rotation = new FairRotationPolicy();

const queue = fc.uniqueArray(
  fc.record({
    id: fc.uuid(),
    queuedAt: fc.bigInt({ min: 0n, max: MAX_INITIAL_QUEUE_TIME_IN_MICROSECONDS }),
  }),
  { selector: ({ id }) => id, minLength: 2, maxLength: MAX_DRIVERS },
);

function makeEntry({ id, queuedAt }: { readonly id: string; readonly queuedAt: bigint }) {
  return {
    driverId: f.unwrap(createDriverId(id)),
    standId: f.standId,
    availability: 'online',
    queuedAt,
  } as const;
}

function moveFirstToBack(entries: readonly OnlineDriverQueueEntry[]) {
  const first = rotation.rank(entries)[0];
  assert(first);
  const reserved = f.unwrap(reserveDriverQueueEntry(first, f.offerId));
  const released = f.unwrap(
    releaseDriverQueueEntry({
      entry: reserved,
      outcome: 'declined',
      offerId: f.offerId,
      now: f.at(0),
      standEntries: entries,
    }),
  );
  return {
    driverId: first.driverId,
    entries: entries.map((entry) => (entry === first ? released : entry)),
  };
}

it('I9 keeps first-offer counts within one in a balanced replay', () => {
  fc.assert(
    fc.property(queue, fc.integer({ min: 1, max: MAX_ROUNDS }), (initial, rounds) => {
      let entries: readonly OnlineDriverQueueEntry[] = initial.map(makeEntry);
      const counts = new Map(entries.map(({ driverId }) => [driverId, 0]));
      for (let round = 0; round < rounds; round++) {
        const next = moveFirstToBack(entries);
        counts.set(next.driverId, (counts.get(next.driverId) ?? 0) + 1);
        const totals = [...counts.values()];
        expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(1);
        entries = next.entries;
      }
    }),
    { numRuns: PROPERTY_RUNS },
  );
});
