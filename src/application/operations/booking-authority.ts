import type { Instant } from '@domain/shared/instant.value-object';
import { evaluateBookingCapability } from '@domain/town/town';
import type { BookingScope } from '@domain/town/town';
import type { DispatchSettings } from '@domain/dispatch/booking-request';
import type { StandFallbackPolicy } from '@domain/dispatch/stand-fallback.policy';
import type { LandmarkId, RiderId } from '@domain/shared/ids.value-object';
import type { Stand, StandRepository } from '../ports/stand-repository';
import type { TownRecord } from '../ports/town-repository';

export function sameScope(first: BookingScope, second: BookingScope): boolean {
  return first.townId === second.townId && first.demoRunId === second.demoRunId;
}

export function getScope({ townId, demoRunId }: BookingScope): BookingScope {
  return demoRunId === undefined ? { townId } : { townId, demoRunId };
}

export function canBookTown(
  record: TownRecord | undefined,
  scope: BookingScope & { readonly riderId?: RiderId },
  now: Instant,
): boolean {
  if (!record || record.town.townId !== scope.townId) return false;
  const capability = evaluateBookingCapability(record.town, now);
  if (capability.kind === 'live') return scope.demoRunId === undefined;
  return (
    capability.kind === 'simulated' &&
    record.demoRuns.some(
      ({ demoRunId, riderId }) =>
        demoRunId === scope.demoRunId && (scope.riderId === undefined || riderId === scope.riderId),
    )
  );
}

export function servesPickup(
  stand: Stand | undefined,
  scope: BookingScope,
  pickupId: LandmarkId,
): stand is Stand {
  return stand !== undefined && sameScope(stand, scope) && stand.pickupCues[pickupId] !== undefined;
}

export async function getDispatchSettings(
  stands: StandRepository,
  { town, stand, pickupId }: { town: TownRecord | undefined; stand: Stand; pickupId: LandmarkId },
  standFallback: StandFallbackPolicy,
): Promise<DispatchSettings> {
  const neighbours = await Promise.all(stand.neighbourStandIds.map((id) => stands.get(id)));
  return {
    standFallback,
    alternateStandIds: neighbours.flatMap((record) =>
      servesPickup(record?.value, stand, pickupId) ? [record.value.standId] : [],
    ),
    ...(town?.dispatchDuration === undefined ? {} : { dispatchDuration: town.dispatchDuration }),
    ...(town?.maxSearchStands === undefined ? {} : { maxSearchStands: town.maxSearchStands }),
  };
}
