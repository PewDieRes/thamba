export interface Versioned<T> {
  readonly value: T;
  readonly version: number;
}

export type ExpectedVersion = number | null;
