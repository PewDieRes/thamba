import type { Booking } from '@domain/dispatch/booking';
import { DISPATCH_ACTOR } from '@domain/dispatch/booking-events';
import { isScheduleDue } from '@domain/dispatch/booking-request';
import type { DeclinePenaltyPolicy } from '@domain/dispatch/decline-penalty.policy';
import type { DriverRankingPolicy } from '@domain/dispatch/driver-ranking.policy';
import type { StandFallbackPolicy } from '@domain/dispatch/stand-fallback.policy';
import type { BookingId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import { err, ok } from '@domain/shared/result';
import type { IdGenerator } from '../ports/id-generator';
import type { TownRecord } from '../ports/town-repository';
import type { Transaction } from '../ports/unit-of-work';
import type { Versioned } from '../ports/versioned';
import { allocateRideOffer } from './allocate-ride-offer';
import { canBookTown, getDispatchSettings, sameScope } from './booking-authority';
import { mapBookingProgress } from './booking.mapper';
import { commit, type CommandDecision } from './execute-command';
import { planDispatch } from './dispatch-snapshot';
import { advanceDemoDriver } from './advance-demo-driver';
import { saveBookingDecision } from './save-booking-decision';
import { saveOfferResolution } from './save-offer-resolution';

export interface DispatchPolicies {
  readonly driverRanking: DriverRankingPolicy;
  readonly standFallback: StandFallbackPolicy;
  readonly declinePenalty: DeclinePenaltyPolicy;
}

interface DispatchContext extends DispatchPolicies {
  readonly now: Instant;
  readonly ids: IdGenerator;
  readonly town: TownRecord | undefined;
}

type Progress = ReturnType<typeof mapBookingProgress>;

export async function advanceBookingDispatch(
  tx: Transaction,
  bookingId: BookingId,
  options: Omit<DispatchContext, 'town'>,
): Promise<CommandDecision<Progress>> {
  const current = await tx.bookings.get(bookingId);
  if (!current) return err({ code: 'not_found' });
  const { state } = current.value;
  const town = (await tx.towns.get(state.townId))?.value;
  const context = { ...options, town };
  const simulated = await advanceDemoDriver(tx, current, context);
  if (simulated) return simulated;
  if (state.status !== 'scheduled') return advanceActive(tx, current, context);
  if (!isScheduleDue(state, options.now)) return commit(mapBookingProgress(current.value));

  const activated = await activateSchedule(tx, current, context);
  if (!activated.ok) return activated;
  return advanceActive(tx, activated.value, context);
}

async function activateSchedule(
  tx: Transaction,
  current: Versioned<Booking>,
  context: DispatchContext,
) {
  const { town, now, ids, standFallback } = context;
  const { state } = current.value;
  const stand = (await tx.stands.get(state.standId))?.value;
  const pickupId = state.fare.route.pickupLandmarkId;
  const canBook = canBookTown(town, state, now);
  const settings =
    stand && sameScope(stand, state)
      ? await getDispatchSettings(tx.stands, { stand, town, pickupId }, standFallback)
      : {
          standFallback,
          ...(town?.dispatchDuration === undefined
            ? {}
            : { dispatchDuration: town.dispatchDuration }),
        };
  const decision = canBook
    ? current.value.activate({ canBook, ...settings }, now)
    : current.value.closeSchedule({ canBook }, now);
  if (!decision.ok) return decision;
  const saved = await saveBookingDecision(tx, decision.value, {
    ids,
    expectedVersion: current.version,
  });
  return saved.ok ? readCommittedStage(tx, state.bookingId) : saved;
}

async function advanceActive(
  tx: Transaction,
  current: Versioned<Booking>,
  context: DispatchContext,
): Promise<CommandDecision<Progress>> {
  const { now, ids, town, driverRanking, declinePenalty } = context;
  const booking = current.value;
  const { state } = booking;
  if (state.status !== 'requested' && state.status !== 'offering')
    return commit(mapBookingProgress(booking));
  const canBook = canBookTown(town, state, now);
  const { step, eligibleDriverIds } = await planDispatch(tx, booking, {
    now,
    canBook,
    driverRanking,
  });
  switch (step.type) {
    case 'wait_for_response':
      return commit(mapBookingProgress(booking));
    case 'offer_to':
    case 'escalate_to_stand':
      return allocateRideOffer(tx, { current, selection: step, eligibleDriverIds, town, now, ids });
    case 'give_up':
      return endDispatch(tx, current, {
        now,
        ids,
        canBook,
        declinePenalty,
        areStandsExhausted: step.reason === 'stands_exhausted',
      });
    case 'expire_offer':
      return expireAndAdvance(tx, current, { ...context, offerId: step.offerId, canBook });
  }
}

async function expireAndAdvance(
  tx: Transaction,
  current: Versioned<Booking>,
  context: DispatchContext & {
    offerId: import('@domain/shared/ids.value-object').RideOfferId;
    canBook: boolean;
  },
): Promise<CommandDecision<Progress>> {
  const { now, offerId, canBook } = context;
  const decision = current.value.closeOffer(
    { canBook, actor: DISPATCH_ACTOR, offerId, action: 'expire' },
    now,
  );
  if (!decision.ok) return decision;
  const saved = await saveOfferResolution(tx, {
    ...context,
    before: current,
    decision: decision.value,
  });
  if (!saved.ok) return saved;
  const next = await readCommittedStage(tx, current.value.state.bookingId);
  return next.ok ? advanceActive(tx, next.value, context) : next;
}

async function readCommittedStage(tx: Transaction, bookingId: BookingId) {
  const current = await tx.bookings.get(bookingId);
  return current ? ok(current) : err({ code: 'inconsistent_state' as const });
}

async function endDispatch(
  tx: Transaction,
  current: Versioned<Booking>,
  options: {
    now: Instant;
    ids: IdGenerator;
    canBook: boolean;
    declinePenalty: DeclinePenaltyPolicy;
    areStandsExhausted: boolean;
  },
) {
  const { now, ids } = options;
  const offering = current.value.state.status === 'offering';
  const decision = offering
    ? current.value.endOffering(options, now)
    : current.value.endSearch(options, now);
  if (!decision.ok) return decision;
  const saved = offering
    ? await saveOfferResolution(tx, { ...options, before: current, decision: decision.value })
    : await saveBookingDecision(tx, decision.value, { ids, expectedVersion: current.version });
  return saved.ok ? commit(mapBookingProgress(decision.value.booking)) : saved;
}
