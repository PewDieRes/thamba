import type { OnlineDriverQueueEntry } from './driver-queue-entry';
import type { DriverRankingPolicy } from './driver-ranking.policy';

export class FairRotationPolicy implements DriverRankingPolicy {
  rank(entries: readonly OnlineDriverQueueEntry[]): readonly OnlineDriverQueueEntry[] {
    return entries.toSorted(compareQueueEntries);
  }
}

function compareQueueEntries(left: OnlineDriverQueueEntry, right: OnlineDriverQueueEntry): number {
  if (left.queuedAt < right.queuedAt) return -1;
  if (left.queuedAt > right.queuedAt) return 1;
  if (left.driverId < right.driverId) return -1;
  if (left.driverId > right.driverId) return 1;
  return 0;
}
