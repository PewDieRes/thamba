import type { BookingId, DriverId, RideOfferId, StandId } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import type { Booking } from './booking';
import { getDispatchBlock } from './booking-request';
import type { BookingAuthority } from './booking-request';
import type { BookingScope, BookingState, NoDriverFoundReason } from './booking-state';
import type { DriverQueueEntry, OnlineDriverQueueEntry } from './driver-queue-entry';
import type { DriverRankingPolicy } from './driver-ranking.policy';
import { isRideOfferExpired } from './ride-offer';

interface DispatchStand extends BookingScope {
  readonly standId: StandId;
  readonly servesPickupArea: boolean;
}

interface QueueSnapshot {
  readonly entries: readonly DriverQueueEntry[];
  readonly stands: readonly DispatchStand[];
  readonly activeTripDriverIds: ReadonlySet<DriverId>;
}

interface OfferAttempt {
  readonly bookingId: BookingId;
  readonly driverId: DriverId;
}

export interface DispatchPlannerInput {
  readonly booking: Booking;
  readonly queueSnapshot: QueueSnapshot;
  readonly offerHistory: readonly OfferAttempt[];
  readonly now: Instant;
  readonly authority: BookingAuthority;
  readonly policies: { readonly driverRanking: DriverRankingPolicy };
}

export type DispatchStep =
  | { readonly type: 'offer_to'; readonly driverId: DriverId }
  | { readonly type: 'escalate_to_stand'; readonly standId: StandId; readonly driverId: DriverId }
  | { readonly type: 'wait_for_response'; readonly until: Instant }
  | { readonly type: 'expire_offer'; readonly offerId: RideOfferId }
  | { readonly type: 'give_up'; readonly reason: NoDriverFoundReason };

export function planNextDispatchStep(input: DispatchPlannerInput): DispatchStep {
  const {
    booking: { state },
    authority,
    now,
  } = input;
  if (state.status !== 'requested' && state.status !== 'offering') {
    return { type: 'give_up', reason: 'booking_unavailable' };
  }

  const reason = getDispatchBlock(state, authority, now);
  if (reason !== undefined) return { type: 'give_up', reason };

  if (state.status === 'offering') {
    const offer = state.offer;
    if (offer === undefined) return { type: 'give_up', reason: 'booking_unavailable' };
    return isRideOfferExpired(offer, now)
      ? { type: 'expire_offer', offerId: offer.offerId }
      : { type: 'wait_for_response', until: offer.expiresAt };
  }

  return searchCapturedStands(state, input);
}

function searchCapturedStands(state: BookingState, input: DispatchPlannerInput): DispatchStep {
  const { queueSnapshot, offerHistory, policies } = input;
  const attempted = new Set(
    offerHistory
      .filter(({ bookingId }) => bookingId === state.bookingId)
      .map(({ driverId }) => driverId),
  );
  for (const standId of state.searchStandIds ?? []) {
    if (
      !queueSnapshot.stands.some(
        (stand) => stand.standId === standId && canSearchStand(stand, state),
      )
    ) {
      continue;
    }
    const eligible = queueSnapshot.entries.filter(
      (entry): entry is OnlineDriverQueueEntry =>
        entry.standId === standId &&
        entry.availability === 'online' &&
        entry.reservation === undefined &&
        !queueSnapshot.activeTripDriverIds.has(entry.driverId) &&
        !attempted.has(entry.driverId),
    );
    const [driver] = policies.driverRanking.rank(eligible);
    if (driver === undefined) continue;
    return standId === state.standId
      ? { type: 'offer_to', driverId: driver.driverId }
      : { type: 'escalate_to_stand', standId, driverId: driver.driverId };
  }
  return { type: 'give_up', reason: 'stands_exhausted' };
}

function canSearchStand(stand: DispatchStand, scope: BookingScope): boolean {
  return (
    stand.servesPickupArea && stand.townId === scope.townId && stand.demoRunId === scope.demoRunId
  );
}
