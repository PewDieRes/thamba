export interface DeclinePenaltyInput {
  readonly queuedAt: bigint;
  readonly tailQueuedAt: bigint;
}

export interface DeclinePenaltyPolicy {
  getQueuedAt(input: DeclinePenaltyInput): bigint;
}
