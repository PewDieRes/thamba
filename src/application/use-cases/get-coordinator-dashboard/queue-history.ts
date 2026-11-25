import type {
  QueueChange,
  QueueHistoryRow,
  QueuePosition,
} from '@application/contracts/coordinator-dashboard-view';
import { compareQueueEntries } from '@domain/dispatch/fair-rotation.policy';
import type { DriverId } from '@domain/shared/ids.value-object';

export function rankQueue(entries: readonly QueuePosition[]): Map<DriverId, number> {
  const online = entries.flatMap(({ driverId, queuedAt }) =>
    queuedAt === null ? [] : [{ driverId, queuedAt: BigInt(queuedAt) }],
  );
  online.sort(compareQueueEntries);
  return new Map(online.map(({ driverId }, index) => [driverId, index + 1]));
}

export function replayQueue(
  current: readonly QueuePosition[],
  changes: readonly QueueChange[],
): QueueHistoryRow[] {
  const entries = new Map(current.map((entry) => [entry.driverId, entry]));
  let after = rankQueue(current);
  return [...changes].reverse().map((change) => {
    entries.set(change.driverId, { driverId: change.driverId, queuedAt: change.before });
    const before = rankQueue([...entries.values()]);
    const drivers = new Set([change.driverId, ...before.keys(), ...after.keys()]);
    const movements = [...drivers].flatMap((driverId) => {
      const from = before.get(driverId) ?? null;
      const to = after.get(driverId) ?? null;
      return from === to && driverId !== change.driverId ? [] : [{ driverId, from, to }];
    });
    after = before;
    return { ...change, movements };
  });
}
