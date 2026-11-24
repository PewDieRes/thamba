import type { Clock } from '@application/ports/clock';
import type { Instant } from '@domain/shared/instant.value-object';

export class SystemClock implements Clock {
  constructor(private readonly fromEpochMilliseconds: (value: number) => Instant) {}

  now(): Instant {
    return this.fromEpochMilliseconds(Date.now());
  }
}
