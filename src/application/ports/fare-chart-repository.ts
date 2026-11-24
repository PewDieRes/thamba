import type { FareChart } from '@domain/fares/fare-chart';
import type { TownId } from '@domain/shared/ids.value-object';
import type { WriteResult } from './application-result';
import type { ExpectedVersion, Versioned } from './versioned';

export interface FareChartRepository {
  get(id: TownId): Promise<Versioned<FareChart> | undefined>;
  save(value: FareChart, expectedVersion: ExpectedVersion): Promise<WriteResult>;
}
