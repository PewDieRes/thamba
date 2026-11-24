import type { FareChartRepository } from '@application/ports/fare-chart-repository';
import { FARE_CHART, TOWN } from '../unit/application/demo-data.fixtures';
import { type AdapterFactory, versionedRepositoryContract } from './versioned-repository.fixtures';

export function fareChartRepositoryContract(make: AdapterFactory<FareChartRepository>) {
  versionedRepositoryContract({
    name: 'FareChartRepository',
    make,
    id: TOWN,
    first: FARE_CHART,
    updated: { ...FARE_CHART, version: 2 },
  });
}
