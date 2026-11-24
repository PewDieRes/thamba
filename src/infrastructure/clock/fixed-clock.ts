import type { Clock } from '@application/ports/clock';
import type { Instant } from '@domain/shared/instant.value-object';

export class FixedClock implements Clock {
  constructor(private instant: Instant) {}

  now(): Instant {
    return this.instant;
  }

  set(instant: Instant): void {
    this.instant = instant;
  }
}
