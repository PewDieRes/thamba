import type { OnlineDriverQueueEntry } from './driver-queue-entry';

export interface DriverRankingPolicy {
  rank(entries: readonly OnlineDriverQueueEntry[]): readonly OnlineDriverQueueEntry[];
}
