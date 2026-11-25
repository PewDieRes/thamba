import type { DomainError } from '../shared/domain.error';
import type { DemoRunId, TownId } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import { err, ok } from '../shared/result';
import type { Result } from '../shared/result';
import type { Licence } from './licence';

export type BookingMode = 'simulated' | 'live';

export interface BookingScope {
  readonly townId: TownId;
  readonly demoRunId?: DemoRunId;
}

export interface SimulationProfile {
  readonly kind: 'synthetic';
}

export type BookingContext =
  | {
      readonly kind: 'simulated';
      readonly townId: TownId;
      readonly simulationProfile: SimulationProfile;
    }
  | { readonly kind: 'live'; readonly townId: TownId; readonly ulin: string };

type LiveModeErrorCode = 'licence_missing' | 'licence_not_yet_valid' | 'licence_expired';

export interface InformationOnly {
  readonly kind: 'information_only';
  readonly reason: 'simulation_profile_missing' | LiveModeErrorCode;
}

interface TownInput {
  readonly townId: TownId;
  readonly licence?: Licence | undefined;
  readonly simulationProfile?: SimulationProfile | undefined;
}

export class Town {
  readonly townId: TownId;
  readonly bookingMode: BookingMode;
  readonly licence: Licence | undefined;
  readonly simulationProfile: SimulationProfile | undefined;

  private constructor(input: TownInput, bookingMode: BookingMode) {
    this.townId = input.townId;
    this.bookingMode = bookingMode;
    this.licence = input.licence && Object.freeze({ ...input.licence });
    this.simulationProfile =
      input.simulationProfile && Object.freeze({ ...input.simulationProfile });
    Object.freeze(this);
  }

  static restore(input: TownInput, bookingMode: BookingMode): Town {
    return new Town(input, bookingMode);
  }

  static create(input: TownInput): Town {
    return new Town(input, 'simulated');
  }

  withBookingMode(
    bookingMode: BookingMode,
    now: Instant,
  ): Result<Town, DomainError<LiveModeErrorCode>> {
    if (bookingMode === 'live') {
      const authority = evaluateLiveCapability(this, now);
      if (authority.kind === 'information_only') return err({ code: authority.reason });
    }
    return ok(new Town(this, bookingMode));
  }
}

export function evaluateBookingCapability(
  town: Town,
  now: Instant,
): BookingContext | InformationOnly {
  if (town.bookingMode === 'live') return evaluateLiveCapability(town, now);
  const { townId, simulationProfile } = town;
  return simulationProfile?.kind === 'synthetic'
    ? { kind: 'simulated', townId, simulationProfile }
    : { kind: 'information_only', reason: 'simulation_profile_missing' };
}

type LiveCapability =
  | Extract<BookingContext, { kind: 'live' }>
  | { readonly kind: 'information_only'; readonly reason: LiveModeErrorCode };

function evaluateLiveCapability(town: Town, now: Instant): LiveCapability {
  const { townId, licence } = town;
  if (!licence) return { kind: 'information_only', reason: 'licence_missing' };
  if (now.isBefore(licence.startsAt)) {
    return { kind: 'information_only', reason: 'licence_not_yet_valid' };
  }
  if (now.isAtOrAfter(licence.endsAt)) {
    return { kind: 'information_only', reason: 'licence_expired' };
  }
  return { kind: 'live', townId, ulin: licence.ulin };
}
