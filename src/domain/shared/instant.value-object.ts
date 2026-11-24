import type { DomainError } from './domain.error';
import type { Duration } from './duration.value-object';
import { isSafeInteger } from './integer.validation';
import { err, ok } from './result';
import type { Result } from './result';

export type InstantError = DomainError<'invalid_instant'>;

export class Instant {
  readonly #epochMilliseconds: number;

  private constructor(epochMilliseconds: number) {
    this.#epochMilliseconds = epochMilliseconds;
  }

  static fromEpochMilliseconds(epochMilliseconds: unknown): Result<Instant, InstantError> {
    if (!isSafeInteger(epochMilliseconds)) {
      return err({ code: 'invalid_instant' });
    }
    return ok(new Instant(epochMilliseconds === 0 ? 0 : epochMilliseconds));
  }

  get epochMilliseconds(): number {
    return this.#epochMilliseconds;
  }

  isBefore(other: Instant): boolean {
    return this.#epochMilliseconds < other.#epochMilliseconds;
  }

  isAtOrAfter(other: Instant): boolean {
    return this.#epochMilliseconds >= other.#epochMilliseconds;
  }

  plus(duration: Duration): Result<Instant, InstantError> {
    return Instant.fromEpochMilliseconds(this.#epochMilliseconds + duration.milliseconds);
  }
}
