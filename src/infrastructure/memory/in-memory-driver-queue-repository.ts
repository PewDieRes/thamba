import type { StandId } from '@domain/shared/ids.value-object';
import type { BookingScope } from '@domain/town/town';
import type { DriverId } from '@domain/shared/ids.value-object';
import type {
  DriverQueueRepository,
  ScopedQueueEntry,
} from '@application/ports/driver-queue-repository';
import type { WriteResult } from '@application/ports/application-result';
import type { ExpectedVersion } from '@application/ports/versioned';
import { MemoryTable } from './memory-table';

export class InMemoryDriverQueueRepository implements DriverQueueRepository {
  constructor(private readonly table = new MemoryTable<ScopedQueueEntry>()) {}

  get(id: DriverId) {
    return Promise.resolve(this.table.get(id));
  }

  listForStands(scope: BookingScope, standIds: readonly StandId[]) {
    return Promise.resolve(
      this.table
        .list()
        .filter(
          ({ value }) =>
            value.townId === scope.townId &&
            value.demoRunId === scope.demoRunId &&
            standIds.includes(value.entry.standId),
        ),
    );
  }

  save(value: ScopedQueueEntry, expectedVersion: ExpectedVersion): Promise<WriteResult> {
    const id = value.entry.driverId;
    return Promise.resolve(this.table.save(id, value, expectedVersion));
  }
}
