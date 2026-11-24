import { expect, it } from 'vitest';
import type { OnlineDriverQueueEntry } from '@domain/dispatch/driver-queue-entry';
import {
  getTailQueuedAt,
  joinDriverQueue,
  leaveDriverQueue,
  releaseDriverQueueEntry,
  reserveDriverQueueEntry,
} from '@domain/dispatch/driver-queue-entry';
import { FairRotationPolicy } from '@domain/dispatch/fair-rotation.policy';
import { KeepPositionPolicy } from '@domain/dispatch/keep-position.policy';
import { MoveToBackOfQueuePolicy } from '@domain/dispatch/move-to-back-of-queue.policy';
import * as f from './booking.fixtures';

const entry = {
  driverId: f.driverId,
  standId: f.standId,
  availability: 'online',
  queuedAt: 100n,
} satisfies OnlineDriverQueueEntry;
const reserved = { ...entry, reservation: f.offerId };
const anotherEntry = {
  ...entry,
  driverId: f.otherDriverId,
  queuedAt: 600n,
  reservation: f.otherOfferId,
};
const standEntries = [reserved, anotherEntry];
const release = { entry: reserved, now: f.at(0), standEntries, offerId: f.offerId };
const moved = { ...entry, queuedAt: 601n };

it('ranks by queue time and then by canonical Driver ID without changing input', () => {
  const later = { ...entry, queuedAt: 200n };
  const tied = { ...entry, driverId: f.otherDriverId };
  const ranking = new FairRotationPolicy();

  expect(ranking.rank(Object.freeze([tied, entry]))).toEqual([entry, tied]);
  expect(ranking.rank(Object.freeze([later, tied]))).toEqual([tied, later]);
});

it('appends one microsecond after the latest entry, including reserved entries', () => {
  const otherStand = { ...anotherEntry, standId: f.otherStandId, queuedAt: 800n };
  const options = { standId: f.standId, entries: [...standEntries, otherStand] };
  expect(getTailQueuedAt({ ...options, now: f.at(0) })).toBe(601n);
  expect(getTailQueuedAt({ ...options, now: f.at(1) })).toBe(1000n);
  expect(getTailQueuedAt({ ...options, entries: [], now: f.at(-1) })).toBe(-1000n);
});

it('retains position on issuance and protects the current reservation', () => {
  expect(f.unwrap(reserveDriverQueueEntry(entry, f.offerId))).toEqual(reserved);
  expect(reserveDriverQueueEntry(reserved, f.otherOfferId)).toMatchObject({ ok: false });
  expect(reserveDriverQueueEntry(leaveDriverQueue(entry), f.offerId)).toMatchObject({ ok: false });
  expect(
    releaseDriverQueueEntry({ ...release, outcome: 'expired', offerId: f.otherOfferId }),
  ).toMatchObject({ ok: false });
});

it('moves declines to the tail by default and can keep the original position', () => {
  expect(f.unwrap(releaseDriverQueueEntry({ ...release, outcome: 'declined' }))).toEqual(moved);
  expect(
    f.unwrap(
      releaseDriverQueueEntry({
        ...release,
        outcome: 'declined',
        declinePenalty: new MoveToBackOfQueuePolicy(),
      }),
    ),
  ).toEqual(moved);
  expect(
    f.unwrap(
      releaseDriverQueueEntry({
        ...release,
        outcome: 'declined',
        declinePenalty: new KeepPositionPolicy(),
      }),
    ),
  ).toEqual(entry);
});

it.each([99n, 602n])(
  'moves a decline to the tail if a policy returns an invalid position',
  (position) => {
    const declinePenalty = { getQueuedAt: () => position };
    expect(
      f.unwrap(releaseDriverQueueEntry({ ...release, outcome: 'declined', declinePenalty })),
    ).toEqual(moved);
  },
);

it('allows a decline policy to move a Driver later within the queue', () => {
  const declinePenalty = { getQueuedAt: () => 200n };
  expect(
    f.unwrap(releaseDriverQueueEntry({ ...release, outcome: 'declined', declinePenalty })),
  ).toEqual({ ...entry, queuedAt: 200n });
});

it('appends an expired Driver to the tail and restores a withdrawn Driver at their original time', () => {
  const declinePenalty = new KeepPositionPolicy();
  expect(
    f.unwrap(releaseDriverQueueEntry({ ...release, outcome: 'expired', declinePenalty })),
  ).toEqual(moved);
  expect(f.unwrap(releaseDriverQueueEntry({ ...release, outcome: 'withdrawn' }))).toEqual(entry);
});

it('leaves the rotation on acceptance, break, Coordinator skip or walk-up', () => {
  const offline = leaveDriverQueue(reserved);
  expect(offline).toEqual({ availability: 'offline', driverId: f.driverId, standId: f.standId });
  expect(leaveDriverQueue(offline)).toEqual(offline);
});

it('requires an empty Trip slot to rejoin and preserves the time on repeated rejoin', () => {
  const input = { ...release, entry: leaveDriverQueue(entry), hasActiveTrip: true };
  expect(joinDriverQueue(input)).toMatchObject({ ok: false });

  const afterTrip = { ...input, hasActiveTrip: false };
  const joined = f.unwrap(joinDriverQueue(afterTrip));
  expect(joined).toEqual(moved);
  expect(f.unwrap(joinDriverQueue({ ...afterTrip, entry: joined, now: f.at(2) }))).toBe(joined);
});
