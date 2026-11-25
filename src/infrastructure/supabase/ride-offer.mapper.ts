import type { RecordedRideOffer } from '@application/ports/ride-offer-repository';
import type { RideOffer } from '@domain/dispatch/ride-offer';
import type { Tables } from './database.types';
import type { DomainValues } from './domain-values';
import { readInstant, readScope, unpack, versioned, writeRunScope } from './row.mapper';

export type RideOfferRow = Pick<
  Tables<'ride_offers'>,
  | 'id'
  | 'town_id'
  | 'run_scope_id'
  | 'stand_id'
  | 'booking_id'
  | 'driver_id'
  | 'issued_at'
  | 'expires_at'
  | 'status'
  | 'version'
>;

export function fromRideOfferRow(row: RideOfferRow, domain: DomainValues) {
  const issuedAt = readInstant(row.issued_at, domain);
  const expiresAt = readInstant(row.expires_at, domain);
  const offer = unpack(
    domain.offer({
      bookingId: row.booking_id as RideOffer['bookingId'],
      offerId: row.id as RideOffer['offerId'],
      driverId: row.driver_id as RideOffer['driverId'],
      standId: row.stand_id as RideOffer['standId'],
      now: issuedAt,
      dispatchDeadline: expiresAt,
      offerTimeout: unpack(
        domain.duration(expiresAt.epochMilliseconds - issuedAt.epochMilliseconds),
      ),
    }),
  );
  return versioned<RecordedRideOffer>(row, {
    ...readScope(row.town_id, row.run_scope_id),
    offer,
    status: row.status as RecordedRideOffer['status'],
  });
}

export function toRideOfferRow(value: RecordedRideOffer): Omit<RideOfferRow, 'version'> {
  const { offer, status } = value;
  return {
    ...writeRunScope(value),
    id: offer.offerId,
    booking_id: offer.bookingId,
    stand_id: offer.standId,
    driver_id: offer.driverId,
    issued_at: new Date(offer.issuedAt.epochMilliseconds).toISOString(),
    expires_at: new Date(offer.expiresAt.epochMilliseconds).toISOString(),
    status,
  };
}
