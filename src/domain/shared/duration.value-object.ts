import type { DomainError } from './domain.error';
import { isSafeInteger } from './integer.validation';
import { err, ok } from './result';
import type { Result } from './result';

export type DurationError = DomainError<'invalid_duration'>;

export class Duration {
  readonly #milliseconds: number;

  private constructor(milliseconds: number) {
    this.#milliseconds = milliseconds;
  }

  static fromMilliseconds(milliseconds: unknown): Result<Duration, DurationError> {
    if (!isSafeInteger(milliseconds) || milliseconds < 0) {
      return err({ code: 'invalid_duration' });
    }
    return ok(new Duration(milliseconds === 0 ? 0 : milliseconds));
  }

  get milliseconds(): number {
    return this.#milliseconds;
  }
}
