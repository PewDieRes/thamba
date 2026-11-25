import type { FareChartRepository } from '@application/ports/fare-chart-repository';
import type { ExpectedVersion } from '@application/ports/versioned';
import type { TownId } from '@domain/shared/ids.value-object';
import type { FareChart } from '@domain/fares/fare-chart';
import type { DomainValues } from './domain-values';
import { fromFareChartRow, toFareChartRow } from './fare-chart.mapper';
import { getRow, type RepositoryStorage } from './repository-storage';

export class SupabaseFareChartRepository implements FareChartRepository {
  constructor(
    private readonly storage: RepositoryStorage,
    private readonly domain: DomainValues,
  ) {}

  async get(id: TownId) {
    const row = await getRow(this.storage, 'charts', { town_id: id });
    return row && fromFareChartRow(row, this.domain);
  }

  save(value: FareChart, expectedVersion: ExpectedVersion) {
    return this.storage.save({
      resource: 'charts',
      key: { town_id: value.townId },
      row: toFareChartRow(value),
      expectedVersion,
    });
  }
}
