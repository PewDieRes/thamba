import type { DomainError } from './domain.error';
import { isSafeInteger } from './integer.validation';
import { err, ok } from './result';
import type { Result } from './result';

const MIN_PASSENGER_COUNT = 1;
const DEFAULT_MAX_PASSENGER_COUNT = 3;

export type PassengerCountError = DomainError<
  'invalid_passenger_count' | 'invalid_max_passenger_count'
>;

export class PassengerCount {
  readonly #count: number;

  private constructor(count: number) {
    this.#count = count;
  }

  static fromCount(
    input: unknown,
    maxCount: unknown = DEFAULT_MAX_PASSENGER_COUNT,
  ): Result<PassengerCount, PassengerCountError> {
    if (!isSafeInteger(maxCount) || maxCount < MIN_PASSENGER_COUNT) {
      return err({ code: 'invalid_max_passenger_count' });
    }
    if (!isSafeInteger(input) || input < MIN_PASSENGER_COUNT || input > maxCount) {
      return err({ code: 'invalid_passenger_count' });
    }
    return ok(new PassengerCount(input));
  }

  get count(): number {
    return this.#count;
  }
}
