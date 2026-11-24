import type { DeclinePenaltyInput, DeclinePenaltyPolicy } from './decline-penalty.policy';

export class KeepPositionPolicy implements DeclinePenaltyPolicy {
  getQueuedAt({ queuedAt }: DeclinePenaltyInput): bigint {
    return queuedAt;
  }
}
