import type { Booking } from '@domain/dispatch/booking';
import type { DeclinePenaltyPolicy } from '@domain/dispatch/decline-penalty.policy';
import { getDispatchBlock } from '@domain/dispatch/booking-request';
import { isRideOfferExpired } from '@domain/dispatch/ride-offer';
import type { DriverSession } from '@domain/identity/driver-device';
import type { RideOfferId, SessionSubject } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import { err, ok } from '@domain/shared/result';
import type { IdGenerator } from '../ports/id-generator';
import type { Transaction } from '../ports/unit-of-work';
import type { Versioned } from '../ports/versioned';
import { canBookTown } from './booking-authority';
import { mapBookingProgress } from './booking.mapper';
import { getDriverSession } from './driver-session';
import { commit, rejectAfterCommit } from './execute-command';
import { saveOfferResolution } from './save-offer-resolution';

interface Response {
  readonly subject: SessionSubject;
  readonly offerId: RideOfferId;
  readonly action: 'accept' | 'decline';
}

interface ResponseOptions {
  readonly now: Instant;
  readonly ids: IdGenerator;
  readonly declinePenalty: DeclinePenaltyPolicy;
}

export async function respondToOffer(
  tx: Transaction,
  response: Response,
  options: ResponseOptions,
) {
  const session = await getDriverSession(tx.devices, response.subject);
  if (!session.ok) return session;
  const current = await getCurrentOffer(tx, {
    offerId: response.offerId,
    driver: session.value.driver,
  });
  if (!current.ok) return current;
  return decideResponse(
    tx,
    { ...current.value, action: response.action, driver: session.value.driver },
    options,
  );
}

async function getCurrentOffer(
  tx: Transaction,
  { offerId, driver }: { offerId: RideOfferId; driver: DriverSession },
) {
  const recorded = (await tx.offers.get(offerId))?.value;
  if (recorded?.offer.driverId !== driver.device.driverId)
    return err({ code: 'not_found' as const });
  if (recorded.status === 'expired') return err({ code: 'offer_expired' as const });
  const current = await tx.bookings.get(recorded.offer.bookingId);
  if (recorded.status !== 'pending' || current?.value.state.offer?.offerId !== offerId) {
    return err({ code: 'offer_mismatch' as const });
  }
  return ok({ current, offer: recorded.offer });
}

async function decideResponse(
  tx: Transaction,
  {
    current,
    offer,
    action,
    driver,
  }: {
    current: Versioned<Booking>;
    offer: import('@domain/dispatch/ride-offer').RideOffer;
    action: Response['action'];
    driver: DriverSession;
  },
  options: ResponseOptions,
) {
  const { now } = options;
  const { offerId } = offer;
  const { state } = current.value;
  const town = (await tx.towns.get(state.townId))?.value;
  const canBook = canBookTown(town, state, now);
  const actor = { type: 'driver' as const, driverId: driver.device.driverId };
  const block = getDispatchBlock(state, { canBook }, now);
  const expired = isRideOfferExpired(offer, now);
  const rejected = expired ? 'offer_expired' : block;
  if (rejected)
    return reconcileRejectedOffer(tx, current, {
      ...options,
      canBook,
      block,
      rejected,
      offerId,
      actor,
    });

  return recordResponse(tx, { current, canBook, offerId, action, actor, driver }, options);
}

async function recordResponse(
  tx: Transaction,
  {
    current,
    canBook,
    offerId,
    action,
    actor,
    driver,
  }: {
    current: Versioned<Booking>;
    canBook: boolean;
    offerId: RideOfferId;
    action: Response['action'];
    actor: import('@domain/dispatch/booking-events').DriverActor;
    driver: DriverSession;
  },
  options: ResponseOptions,
) {
  const decision =
    action === 'decline'
      ? current.value.closeOffer({ canBook, offerId, action, actor }, options.now)
      : await acceptOffer(tx, current.value, { driver, offerId, ...options });
  if (!decision.ok) return decision;
  const saved = await saveOfferResolution(tx, {
    ...options,
    before: current,
    decision: decision.value,
  });
  if (!saved.ok) return saved;
  const progress = mapBookingProgress(decision.value.booking);
  return commit(progress);
}

async function acceptOffer(
  tx: Transaction,
  booking: Booking,
  {
    driver,
    offerId,
    now,
    ids,
  }: Pick<ResponseOptions, 'now' | 'ids'> & { driver: DriverSession; offerId: RideOfferId },
) {
  const driverId = driver.device.driverId;
  const queue = await tx.drivers.get(driverId);
  if (!queue || (await tx.trips.findActiveByDriver(driverId)))
    return err({ code: 'driver_not_reserved' as const });
  return booking.acceptOffer(
    { driver, offerId, entry: queue.value.entry, canBook: true, tripId: ids.next<'Trip'>() },
    now,
  );
}

async function reconcileRejectedOffer(
  tx: Transaction,
  current: Versioned<Booking>,
  options: ResponseOptions & {
    canBook: boolean;
    block: 'dispatch_deadline' | 'booking_unavailable' | undefined;
    rejected: 'offer_expired' | 'dispatch_deadline' | 'booking_unavailable';
    offerId: RideOfferId;
    actor: import('@domain/dispatch/booking-events').DriverActor;
  },
) {
  const { now, canBook, block, rejected, offerId, actor } = options;
  const decision = block
    ? current.value.endOffering({ canBook, actor }, now)
    : current.value.closeOffer(
        { canBook, offerId, action: 'expire', actor: { type: 'dispatch' } },
        now,
      );
  if (!decision.ok) return decision;
  const saved = await saveOfferResolution(tx, {
    ...options,
    before: current,
    decision: decision.value,
  });
  return saved.ok ? rejectAfterCommit({ code: rejected }) : saved;
}
