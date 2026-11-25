import type { LandmarkId, StandId } from '@domain/shared/ids.value-object';
import type { BookingScope } from '@domain/town/town';

import type { Translations } from '../contracts/town-overview-view';

export interface Stand extends BookingScope {
  readonly name?: string;
  readonly names?: Translations;
  readonly coordinatorContacts?: Translations;
  readonly standId: StandId;
  readonly pickupCueTranslations?: Readonly<Partial<Record<LandmarkId, Translations>>>;
  readonly pickupCues: Readonly<Partial<Record<LandmarkId, string>>>;
  readonly neighbourStandIds: readonly StandId[];
  readonly coordinatorContact: string;
}
import type { WriteResult } from './application-result';
import type { ExpectedVersion, Versioned } from './versioned';

export interface StandRepository {
  get(id: StandId): Promise<Versioned<Stand> | undefined>;
  save(value: Stand, expectedVersion: ExpectedVersion): Promise<WriteResult>;
}
