import type { StandRepository, Stand } from '@application/ports/stand-repository';
import type { ExpectedVersion } from '@application/ports/versioned';
import type { StandId } from '@domain/shared/ids.value-object';
import { fromStandRow, toStandRow } from './stand.mapper';
import { getRow, type RepositoryStorage } from './repository-storage';

export class SupabaseStandRepository implements StandRepository {
  constructor(private readonly storage: RepositoryStorage) {}

  async get(id: StandId) {
    const row = await getRow(this.storage, 'stands', { id: id });
    return row && fromStandRow(row);
  }

  save(value: Stand, expectedVersion: ExpectedVersion) {
    return this.storage.save({
      resource: 'stands',
      key: { id: value.standId },
      row: toStandRow(value),
      expectedVersion,
    });
  }
}
