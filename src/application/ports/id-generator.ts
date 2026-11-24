import type { Id } from '@domain/shared/ids.value-object';

export interface IdGenerator {
  next<Kind extends string>(): Id<Kind>;
}
