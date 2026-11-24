import type { WriteResult } from '@application/ports/application-result';
import type { ExpectedVersion, Versioned } from '@application/ports/versioned';

function freezeCopy<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return Object.freeze(value.map(freezeCopy)) as T;
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;
  const fields = Object.entries(value).map(([key, field]: [string, unknown]) => [
    key,
    freezeCopy(field),
  ]);
  return Object.freeze(Object.fromEntries(fields)) as T;
}

export class MemoryTable<T> {
  #isWritable = true;
  #hasChanges = false;

  constructor(private readonly rows = new Map<string, Versioned<T>>()) {}

  get hasChanges(): boolean {
    return this.#hasChanges;
  }

  fork(): MemoryTable<T> {
    return new MemoryTable(new Map(this.rows));
  }

  seal(): void {
    this.#isWritable = false;
  }

  get(id: string): Versioned<T> | undefined {
    return this.rows.get(id);
  }

  list(): readonly Versioned<T>[] {
    return [...this.rows.values()];
  }

  save(id: string, value: T, expectedVersion: ExpectedVersion): WriteResult {
    const currentVersion = this.rows.get(id)?.version ?? null;
    if (!this.#isWritable || currentVersion !== expectedVersion) {
      return { ok: false, error: { code: 'ConcurrencyConflict' } };
    }
    this.rows.set(
      id,
      Object.freeze({ value: freezeCopy(value), version: (currentVersion ?? 0) + 1 }),
    );
    this.#hasChanges = true;
    return { ok: true, value: undefined };
  }
}
