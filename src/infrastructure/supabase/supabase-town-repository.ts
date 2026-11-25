import type { TownRepository, TownRecord } from '@application/ports/town-repository';
import type { ExpectedVersion } from '@application/ports/versioned';
import type { TownId } from '@domain/shared/ids.value-object';
import type { DomainValues } from './domain-values';
import { fromTownRow, toTownRow } from './town.mapper';
import { getRow, type RepositoryStorage } from './repository-storage';

export class SupabaseTownRepository implements TownRepository {
  constructor(
    private readonly storage: RepositoryStorage,
    private readonly domain: DomainValues,
  ) {}

  async get(id: TownId) {
    const row = await getRow(this.storage, 'towns', { id: id });
    return row && fromTownRow(row, this.domain);
  }

  async findBySlug(slug: string) {
    const row = await getRow(this.storage, 'towns', { slug });
    return row && fromTownRow(row, this.domain);
  }

  save(value: TownRecord, expectedVersion: ExpectedVersion) {
    return this.storage.save({
      resource: 'towns',
      key: { id: value.town.townId },
      row: toTownRow(value),
      expectedVersion,
    });
  }
}
