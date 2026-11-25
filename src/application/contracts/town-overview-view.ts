import type { LandmarkId, StandId, TownId } from '@domain/shared/ids.value-object';
import type { Route } from '@domain/fares/fare-chart';
import type { BookingContext, InformationOnly } from '@domain/town/town';

export type Locale = 'mr' | 'hi' | 'en';
export type Translations = Readonly<Partial<Record<Locale, string>>>;

export interface CatalogueLandmark {
  readonly id: LandmarkId;
  readonly slug: string;
  readonly name: string;
  readonly names: Translations;
  readonly isIllustrative: boolean;
}

export interface CatalogueStand {
  readonly id: StandId;
  readonly name: string;
  readonly names: Translations;
  readonly coordinatorContact: string;
  readonly coordinatorContacts: Translations;
  readonly pickupLandmarkIds: readonly LandmarkId[];
}

export interface TownOverviewView {
  readonly townId: TownId;
  readonly slug: string;
  readonly name: string;
  readonly names: Translations;
  readonly grievanceContact: string;
  readonly grievanceContacts: Translations;
  readonly capability: BookingContext | InformationOnly;
  readonly landmarks: readonly CatalogueLandmark[];
  readonly stands: readonly CatalogueStand[];
  readonly fares: readonly { route: Route; fareInPaise: number; nightFareInPaise: number }[];
  readonly hasIllustrativeFares: boolean;
}
