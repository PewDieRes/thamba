import { describe, expect, test } from 'vitest';
import type { WriteResult } from '@application/ports/application-result';
import type { ExpectedVersion, Versioned } from '@application/ports/versioned';

export type AdapterFactory<P> = () => P | Promise<P>;

interface VersionedRepository<Key, Value> {
  get(id: Key): Promise<Versioned<Value> | undefined>;
  save(value: Value, expectedVersion: ExpectedVersion): Promise<WriteResult>;
}

export const CONFLICT = { ok: false, error: { code: 'ConcurrencyConflict' } } as const;
export const SAVED = { ok: true, value: undefined } as const;

export function versionedRepositoryContract<K, V>(options: {
  readonly name: string;
  readonly make: AdapterFactory<VersionedRepository<K, V>>;
  readonly id: K;
  readonly first: V;
  readonly updated: V;
}) {
  const { name, make, id, first, updated } = options;
  describe(name, () => {
    test('inserts once and updates only the matching version', async () => {
      const repo = await make();
      expect(await repo.get(id)).toBeUndefined();
      expect(await repo.save(updated, 1)).toEqual(CONFLICT);
      expect(await repo.get(id)).toBeUndefined();
      expect(await repo.save(first, null)).toEqual(SAVED);
      expect(await repo.get(id)).toEqual({ version: 1, value: first });
      expect(await repo.save(updated, null)).toEqual(CONFLICT);
      expect(await repo.get(id)).toEqual({ version: 1, value: first });
      expect(await repo.save(updated, 1)).toEqual(SAVED);
      expect(await repo.get(id)).toEqual({ version: 2, value: updated });
      expect(await repo.save(first, 1)).toEqual(CONFLICT);
      expect(await repo.get(id)).toEqual({ version: 2, value: updated });
    });
  });
}
