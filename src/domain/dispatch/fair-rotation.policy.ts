import type { OnlineDriverQueueEntry } from './driver-queue-entry';
import type { DriverRankingPolicy } from './driver-ranking.policy';

export class FairRotationPolicy implements DriverRankingPolicy {
  rank(entries: readonly OnlineDriverQueueEntry[]): readonly OnlineDriverQueueEntry[] {
    return entries.toSorted(compareQueueEntries);
  }
}

type RankedEntry = Pick<OnlineDriverQueueEntry, 'driverId' | 'queuedAt'>;

export function compareQueueEntries(left: RankedEntry, right: RankedEntry): number {
  if (left.queuedAt < right.queuedAt) return -1;
  if (left.queuedAt > right.queuedAt) return 1;
  if (left.driverId < right.driverId) return -1;
  if (left.driverId > right.driverId) return 1;
  return 0;
}
