import type { Duration } from '@domain/shared/duration.value-object';
import type { DemoRunId, RiderId, TownId } from '@domain/shared/ids.value-object';
import type { Town } from '@domain/town/town';

import type {
  CatalogueLandmark,
  CatalogueStand,
  Translations,
} from '../contracts/town-overview-view';

export interface TownRecord {
  readonly names?: Translations;
  readonly grievanceContacts?: Translations;
  readonly landmarks?: readonly CatalogueLandmark[];
  readonly stands?: readonly CatalogueStand[];
  readonly town: Town;
  readonly slug: string;
  readonly name: string;
  readonly grievanceContact: string;
  readonly demoRuns: readonly {
    readonly demoRunId: DemoRunId;
    readonly riderId: RiderId;
    readonly expiresAtEpochMilliseconds?: number;
  }[];
  readonly scheduleLeadTime?: Duration;
  readonly dispatchDuration?: Duration;
  readonly offerTimeout?: Duration;
  readonly maxSearchStands?: number;
}
import type { WriteResult } from './application-result';
import type { ExpectedVersion, Versioned } from './versioned';

export interface TownRepository {
  get(id: TownId): Promise<Versioned<TownRecord> | undefined>;
  findBySlug(slug: string): Promise<Versioned<TownRecord> | undefined>;
  save(value: TownRecord, expectedVersion: ExpectedVersion): Promise<WriteResult>;
}

export type { CatalogueLandmark, CatalogueStand, Translations };
