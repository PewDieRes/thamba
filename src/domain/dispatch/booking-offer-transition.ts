import type { DriverId, RideOfferId, TripId } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import { err, ok } from '../shared/result';
import type { BookingDecision } from './booking-decision';
import { DISPATCH_ACTOR, getBookingEventContext } from './booking-events';
import type {
  BookingActor,
  DispatchActor,
  DriverActor,
  RideOfferDeclined,
  RideOfferExpired,
  RideOfferWithdrawn,
  StandCoordinatorActor,
} from './booking-events';
import { getDispatchBlock } from './booking-request';
import type { BookingAuthority } from './booking-request';
import type { BookingState, PendingBookingOffer } from './booking-state';

export interface IssueOfferInput extends BookingAuthority {
  readonly offer: PendingBookingOffer;
}

interface CurrentOfferInput extends BookingAuthority {
  readonly offerId: RideOfferId;
}

type OfferActor = DispatchActor | DriverActor | StandCoordinatorActor;

export type CloseOfferInput = CurrentOfferInput &
  (
    | { readonly action: 'decline'; readonly actor: DriverActor }
    | { readonly action: 'expire'; readonly actor: DispatchActor }
    | { readonly action: 'withdraw'; readonly actor: DriverActor | StandCoordinatorActor }
  );

export interface AcceptOfferInput extends CurrentOfferInput {
  readonly driverId: DriverId;
  readonly tripId: TripId;
  readonly isOnlineAtStand: boolean;
  readonly hasReservation: boolean;
}

export interface EndOfferingInput extends BookingAuthority {
  readonly actor?: OfferActor;
}

export function issueBookingOffer(
  state: BookingState,
  input: IssueOfferInput,
  now: Instant,
): BookingDecision {
  const block = getDispatchBlock(state, input, now);
  if (block) return err({ code: block });

  const { offerId, driverId, standId, expiresAt } = input.offer;
  if (!state.searchStandIds?.includes(standId)) return err({ code: 'stand_outside_search' });
  if (!now.isBefore(expiresAt) || state.dispatchDeadline?.isBefore(expiresAt)) {
    return err({ code: 'invalid_offer_expiry' });
  }
  const offer = Object.freeze({ offerId, driverId, standId, expiresAt });
  const context = getBookingEventContext(state, DISPATCH_ACTOR, now);
  return ok({
    changes: { offer },
    events: [{ ...context, ...offer, type: 'RideOfferCreated' }],
  });
}

function getOfferActorError(offer: PendingBookingOffer, actor: OfferActor) {
  if (actor.type === 'driver' && actor.driverId !== offer.driverId) return 'driver_mismatch';
  if (actor.type === 'stand_coordinator' && actor.standId !== offer.standId)
    return 'stand_mismatch';
  return undefined;
}

export function closeBookingOffer(
  state: BookingState,
  input: CloseOfferInput,
  now: Instant,
): BookingDecision {
  const offer = state.offer;
  if (offer?.offerId !== input.offerId) return err({ code: 'offer_mismatch' });

  const actorError = getOfferActorError(offer, input.actor);
  if (actorError) return err({ code: actorError });
  const block = getDispatchBlock(state, input, now);
  if (block) return err({ code: block });
  if (input.action === 'expire' && now.isBefore(offer.expiresAt))
    return err({ code: 'offer_not_due' });

  const type = input.action === 'decline' ? 'RideOfferDeclined' : 'RideOfferWithdrawn';
  const event = getOfferCloseEvent(
    state,
    {
      offer,
      actor: input.actor,
      type,
      reason: 'driver_unavailable',
    },
    now,
  );
  return ok({ changes: { offer: undefined }, events: [event] });
}

export function acceptBookingOffer(
  state: BookingState,
  input: AcceptOfferInput,
  now: Instant,
): BookingDecision {
  const offer = state.offer;
  if (offer?.offerId !== input.offerId) return err({ code: 'offer_mismatch' });
  if (offer.driverId !== input.driverId) return err({ code: 'driver_mismatch' });
  if (now.isAtOrAfter(offer.expiresAt)) return err({ code: 'offer_expired' });

  const block = getDispatchBlock(state, input, now);
  if (block) return err({ code: block });
  if (!input.isOnlineAtStand || !input.hasReservation) return err({ code: 'driver_not_reserved' });

  const { offerId, driverId, standId } = offer;
  const trip = Object.freeze({ tripId: input.tripId, driverId, standId });
  const context = getBookingEventContext(state, { type: 'driver', driverId }, now);
  return ok({
    changes: { offer: undefined, trip },
    events: [
      { ...context, offerId, driverId, standId, type: 'RideOfferAccepted' },
      { ...context, ...trip, type: 'BookingAccepted' },
      { ...context, ...trip, fare: state.fare, type: 'TripCreated' },
    ],
  });
}

export function endBookingOffering(
  state: BookingState,
  input: EndOfferingInput,
  now: Instant,
): BookingDecision {
  const offer = state.offer;
  if (!offer) return err({ code: 'offer_mismatch' });

  const actor = input.actor ?? DISPATCH_ACTOR;
  const actorError = getOfferActorError(offer, actor);
  if (actorError) return err({ code: actorError });
  const reason = getDispatchBlock(state, input, now);
  if (!reason) return err({ code: 'dispatch_still_open' });

  const event = getOfferCloseEvent(
    state,
    { offer, actor, type: 'RideOfferWithdrawn', reason: 'booking_unavailable' },
    now,
  );
  return ok({
    changes: { offer: undefined, noDriverFoundReason: reason },
    events: [
      event,
      { ...getBookingEventContext(state, actor, now), type: 'BookingNoDriverFound', reason },
    ],
  });
}

interface OfferClosure {
  readonly offer: PendingBookingOffer;
  readonly actor: BookingActor;
  readonly type: 'RideOfferDeclined' | 'RideOfferWithdrawn';
  readonly reason: RideOfferWithdrawn['reason'];
}

export function getOfferCloseEvent(
  state: BookingState,
  closure: OfferClosure,
  now: Instant,
): RideOfferDeclined | RideOfferExpired | RideOfferWithdrawn {
  const { offerId, driverId, standId, expiresAt } = closure.offer;
  const details = {
    ...getBookingEventContext(state, closure.actor, now),
    offerId,
    driverId,
    standId,
  };
  if (now.isAtOrAfter(expiresAt)) return { ...details, type: 'RideOfferExpired' };
  if (closure.type === 'RideOfferDeclined') return { ...details, type: 'RideOfferDeclined' };
  return { ...details, type: 'RideOfferWithdrawn', reason: closure.reason };
}
