import type { RideOfferRepository } from '@application/ports/ride-offer-repository';
import { describe, expect, test } from 'vitest';
import type { RecordedRideOffer } from '@application/ports/ride-offer-repository';
import { RideOffer } from '@domain/dispatch/ride-offer';
import {
  DEADLINE,
  BOOKING_ID,
  OFFER,
  OFFER_ID,
  OTHER_BOOKING_ID,
  OTHER_OFFER_ID,
} from './contract-data.fixtures';
import { DRIVER_ONE, DRIVER_TWO, NOW, SCOPE, STAND } from '../unit/application/demo-data.fixtures';
import { unwrap } from '../unit/domain/dispatch/booking.fixtures';
import {
  CONFLICT,
  SAVED,
  type AdapterFactory,
  versionedRepositoryContract,
} from './versioned-repository.fixtures';

const pending: RecordedRideOffer = { ...SCOPE, offer: OFFER, status: 'pending' };

export function rideOfferRepositoryContract(make: AdapterFactory<RideOfferRepository>) {
  versionedRepositoryContract({
    name: 'RideOfferRepository',
    make,
    id: OFFER_ID,
    first: pending,
    updated: { ...pending, status: 'declined' },
  });
  describe('RideOfferRepository queries', () => {
    test('prevents duplicate attempts and competing pending offers', async () => {
      const repo = await make();
      expect(await repo.save(pending, null)).toEqual(SAVED);
      expect(await repo.findPendingByDriver(DRIVER_ONE)).toEqual({ version: 1, value: pending });
      const competing = (bookingId: typeof BOOKING_ID, driverId: typeof DRIVER_ONE) => ({
        ...pending,
        offer: unwrap(
          RideOffer.issue({
            bookingId,
            offerId: OTHER_OFFER_ID,
            driverId,
            standId: STAND,
            now: NOW,
            dispatchDeadline: DEADLINE,
          }),
        ),
      });
      expect(await repo.save(competing(BOOKING_ID, DRIVER_TWO), null)).toEqual(CONFLICT);
      expect(await repo.save(competing(OTHER_BOOKING_ID, DRIVER_ONE), null)).toEqual(CONFLICT);
      const declined = { ...pending, status: 'declined' as const };
      expect(await repo.save(declined, 1)).toEqual(SAVED);
      expect(await repo.save(competing(BOOKING_ID, DRIVER_ONE), null)).toEqual(CONFLICT);
      expect(await repo.findPendingByDriver(DRIVER_ONE)).toBeUndefined();
      expect(await repo.listByBooking(BOOKING_ID)).toEqual([declined]);
      expect(await repo.listByBooking(OTHER_BOOKING_ID)).toEqual([]);
    });
  });
}
