import type { DeclinePenaltyInput, DeclinePenaltyPolicy } from './decline-penalty.policy';

export class MoveToBackOfQueuePolicy implements DeclinePenaltyPolicy {
  getQueuedAt({ tailQueuedAt }: DeclinePenaltyInput): bigint {
    return tailQueuedAt;
  }
}
