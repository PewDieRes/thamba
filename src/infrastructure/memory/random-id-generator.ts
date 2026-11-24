import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@application/ports/id-generator';
import type { Id } from '@domain/shared/ids.value-object';

export class RandomIdGenerator implements IdGenerator {
  next<Kind extends string>(): Id<Kind> {
    return randomUUID() as Id<Kind>;
  }
}
