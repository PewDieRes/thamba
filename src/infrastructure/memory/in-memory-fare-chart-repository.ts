import type { FareChart } from '@domain/fares/fare-chart';
import type { TownId } from '@domain/shared/ids.value-object';
import type { FareChartRepository } from '@application/ports/fare-chart-repository';
import type { WriteResult } from '@application/ports/application-result';
import type { ExpectedVersion } from '@application/ports/versioned';
import { MemoryTable } from './memory-table';

export class InMemoryFareChartRepository implements FareChartRepository {
  constructor(private readonly table = new MemoryTable<FareChart>()) {}

  get(id: TownId) {
    return Promise.resolve(this.table.get(id));
  }

  save(value: FareChart, expectedVersion: ExpectedVersion): Promise<WriteResult> {
    const id = value.townId;
    return Promise.resolve(this.table.save(id, value, expectedVersion));
  }
}
