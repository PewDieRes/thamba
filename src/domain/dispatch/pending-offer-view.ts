import { getBoundDriverId } from '../identity/driver-device';
import type { DriverSession, DriverSessionError } from '../identity/driver-device';
import type { DomainError } from '../shared/domain.error';
import type { LandmarkId, RideOfferId } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import { err, ok } from '../shared/result';
import type { Result } from '../shared/result';
import type { BookingState } from './booking-state';
import { isRideOfferExpired } from './ride-offer';

export type PendingOfferView = {
  readonly offerId: RideOfferId;
  readonly pickupLandmarkId: LandmarkId;
  readonly pickupCue: string;
  readonly expiresAtEpochMilliseconds: number;
};

interface PendingOfferViewInput {
  readonly driver: DriverSession;
  readonly pickupCue: string;
}

type PendingOfferViewError =
  DomainError<'offer_mismatch' | 'driver_mismatch' | 'offer_expired'> | DriverSessionError;

export function projectPendingOfferView(
  state: BookingState,
  input: PendingOfferViewInput,
  now: Instant,
): Result<PendingOfferView, PendingOfferViewError> {
  const driver = getBoundDriverId(input.driver);
  if (!driver.ok) return driver;
  const offer = state.offer;
  if (state.status !== 'offering' || offer === undefined) return err({ code: 'offer_mismatch' });
  if (offer.driverId !== driver.value) return err({ code: 'driver_mismatch' });
  if (isRideOfferExpired(offer, now)) return err({ code: 'offer_expired' });

  return ok(
    Object.freeze({
      offerId: offer.offerId,
      pickupLandmarkId: state.fare.route.pickupLandmarkId,
      pickupCue: input.pickupCue,
      expiresAtEpochMilliseconds: offer.expiresAt.epochMilliseconds,
    }),
  );
}
