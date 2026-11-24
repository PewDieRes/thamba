import type { DomainError } from '../shared/domain.error';
import type { StandId } from '../shared/ids.value-object';
import type { Result } from '../shared/result';

export interface StandFallbackInput {
  readonly originalStandId: StandId;
  readonly neighbourStandIds: readonly StandId[];
  readonly maxSearchStands?: number;
}

type StandFallbackError = DomainError<'invalid_stand_search_cap'>;

export interface StandFallbackPolicy {
  capture(input: StandFallbackInput): Result<readonly StandId[], StandFallbackError>;
}
