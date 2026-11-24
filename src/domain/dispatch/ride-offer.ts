import type { DomainError } from '../shared/domain.error';
import type { Duration } from '../shared/duration.value-object';
import type { BookingId, DriverId, RideOfferId, StandId } from '../shared/ids.value-object';
import { Instant } from '../shared/instant.value-object';
import { err, ok } from '../shared/result';
import type { Result } from '../shared/result';

const DEFAULT_OFFER_TIMEOUT_MILLISECONDS = 60_000;

type RideOfferError = DomainError<'dispatch_deadline' | 'invalid_offer_expiry'>;

interface OfferAssignment {
  readonly bookingId: BookingId;
  readonly offerId: RideOfferId;
  readonly driverId: DriverId;
  readonly standId: StandId;
}

interface IssueRideOfferInput extends OfferAssignment {
  readonly now: Instant;
  readonly dispatchDeadline: Instant;
  readonly offerTimeout?: Duration;
}

export class RideOffer {
  readonly bookingId: BookingId;
  readonly offerId: RideOfferId;
  readonly driverId: DriverId;
  readonly standId: StandId;
  readonly issuedAt: Instant;
  readonly expiresAt: Instant;

  private constructor(input: IssueRideOfferInput, expiresAt: Instant) {
    this.bookingId = input.bookingId;
    this.offerId = input.offerId;
    this.driverId = input.driverId;
    this.standId = input.standId;
    this.issuedAt = input.now;
    this.expiresAt = expiresAt;
    Object.freeze(this);
  }

  static issue(input: IssueRideOfferInput): Result<RideOffer, RideOfferError> {
    const { now, dispatchDeadline, offerTimeout } = input;
    if (now.isAtOrAfter(dispatchDeadline)) return err({ code: 'dispatch_deadline' });

    const timeoutMilliseconds = offerTimeout?.milliseconds ?? DEFAULT_OFFER_TIMEOUT_MILLISECONDS;
    if (timeoutMilliseconds === 0) return err({ code: 'invalid_offer_expiry' });

    const timeoutExpiry = Instant.fromEpochMilliseconds(
      now.epochMilliseconds + timeoutMilliseconds,
    );
    const expiresAt =
      timeoutExpiry.ok && timeoutExpiry.value.isBefore(dispatchDeadline)
        ? timeoutExpiry.value
        : dispatchDeadline;
    return ok(new RideOffer(input, expiresAt));
  }

  isExpired(now: Instant): boolean {
    return isRideOfferExpired(this, now);
  }
}

export function isRideOfferExpired(offer: Pick<RideOffer, 'expiresAt'>, now: Instant): boolean {
  return now.isAtOrAfter(offer.expiresAt);
}
