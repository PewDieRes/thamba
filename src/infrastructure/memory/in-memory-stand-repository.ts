import type { StandId } from '@domain/shared/ids.value-object';
import type { StandRepository, Stand } from '@application/ports/stand-repository';
import type { WriteResult } from '@application/ports/application-result';
import type { ExpectedVersion } from '@application/ports/versioned';
import { MemoryTable } from './memory-table';

export class InMemoryStandRepository implements StandRepository {
  constructor(private readonly table = new MemoryTable<Stand>()) {}

  get(id: StandId) {
    return Promise.resolve(this.table.get(id));
  }

  save(value: Stand, expectedVersion: ExpectedVersion): Promise<WriteResult> {
    const id = value.standId;
    return Promise.resolve(this.table.save(id, value, expectedVersion));
  }
}
