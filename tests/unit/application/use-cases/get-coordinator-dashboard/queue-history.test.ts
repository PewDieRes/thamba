import { expect, test } from 'vitest';
import { replayQueue } from '@application/use-cases/get-coordinator-dashboard/queue-history';
import type { EventId } from '@domain/shared/ids.value-object';
import { DRIVER_ONE, DRIVER_TWO, uuid } from '../../demo-data.fixtures';

test('rewinds changes in commit order and records movement of every affected Driver', () => {
  const changes = [
    {
      id: uuid(182) as EventId,
      driverId: DRIVER_ONE,
      before: '1',
      reason: 'break' as const,
      occurredAt: 1,
    },
    {
      id: uuid(183) as EventId,
      driverId: DRIVER_ONE,
      before: null,
      reason: 'available' as const,
      occurredAt: 1,
    },
  ];
  const rows = replayQueue(
    [
      { driverId: DRIVER_ONE, queuedAt: '3' },
      { driverId: DRIVER_TWO, queuedAt: '2' },
    ],
    changes,
  );
  expect(rows.map(({ movements }) => movements)).toEqual([
    [{ driverId: DRIVER_ONE, from: null, to: 2 }],
    [
      { driverId: DRIVER_ONE, from: 1, to: null },
      { driverId: DRIVER_TWO, from: 2, to: 1 },
    ],
  ]);
});
