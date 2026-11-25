import type {
  DriverQueueRepository,
  ScopedQueueEntry,
} from '@application/ports/driver-queue-repository';
import type { ExpectedVersion } from '@application/ports/versioned';
import type { DriverId, StandId } from '@domain/shared/ids.value-object';
import type { BookingScope } from '@domain/town/town';
import { writeRunScope } from './row.mapper';
import { fromDriverQueueRow, toDriverQueueRow } from './driver-queue.mapper';
import { getRow, type RepositoryStorage } from './repository-storage';

export class SupabaseDriverQueueRepository implements DriverQueueRepository {
  constructor(private readonly storage: RepositoryStorage) {}

  async get(id: DriverId) {
    const row = await getRow(this.storage, 'queue', { driver_id: id });
    return row && fromDriverQueueRow(row);
  }

  async listForStands(scope: BookingScope, standIds: readonly StandId[]) {
    if (standIds.length === 0) return [];
    const rows = await this.storage.list('queue', { ...writeRunScope(scope), stand_id: standIds });
    return rows.map(fromDriverQueueRow);
  }

  save(value: ScopedQueueEntry, expectedVersion: ExpectedVersion) {
    return this.storage.save({
      resource: 'queue',
      key: { driver_id: value.entry.driverId },
      row: toDriverQueueRow(value),
      expectedVersion,
    });
  }
}
