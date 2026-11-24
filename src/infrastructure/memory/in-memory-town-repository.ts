import type { TownId } from '@domain/shared/ids.value-object';
import type { TownRepository, TownRecord } from '@application/ports/town-repository';
import type { WriteResult } from '@application/ports/application-result';
import type { ExpectedVersion } from '@application/ports/versioned';
import { MemoryTable } from './memory-table';

export class InMemoryTownRepository implements TownRepository {
  constructor(private readonly table = new MemoryTable<TownRecord>()) {}

  get(id: TownId) {
    return Promise.resolve(this.table.get(id));
  }

  findBySlug(slug: string) {
    return Promise.resolve(this.table.list().find(({ value }) => value.slug === slug));
  }

  save(value: TownRecord, expectedVersion: ExpectedVersion): Promise<WriteResult> {
    const id = value.town.townId;
    if (
      this.table
        .list()
        .some(({ value: existing }) => existing.slug === value.slug && existing.town.townId !== id)
    ) {
      return Promise.resolve({ ok: false, error: { code: 'ConcurrencyConflict' } });
    }

    return Promise.resolve(this.table.save(id, value, expectedVersion));
  }
}
