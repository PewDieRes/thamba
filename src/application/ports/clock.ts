import type { Instant } from '@domain/shared/instant.value-object';

export interface Clock {
  now(): Instant;
}
