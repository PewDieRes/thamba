import { messages } from '@interface/i18n/messages';
import type {
  DriverOfferView,
  DriverStateView,
  DriverTripView,
} from '@application/contracts/driver-state-view';
import { createBookingId, createRideOfferId } from '@domain/shared/ids.value-object';
import { DRIVER_ONE, uuid } from '../../application/demo-data.fixtures';
import { unwrap } from '../../domain/dispatch/booking.fixtures';

export const copy = messages.en.driver.home;
export const NOW_MILLISECONDS = 1_800_000_000_000;
export const OFFER_DURATION_MILLISECONDS = 2_500;
export const riderPhone = '+916000000001';

export const home: DriverStateView = {
  driverId: DRIVER_ONE,
  stand: { name: 'River Square Stand' },
  availability: 'offline',
  queuePosition: null,
  needsRejoin: false,
  trip: null,
};

export const offer: DriverOfferView = {
  offerId: unwrap(createRideOfferId(uuid(30))),
  pickup: { name: 'River Square' },
  pickupCue: 'By the blue sign',
  expiresAtEpochMilliseconds: NOW_MILLISECONDS + OFFER_DURATION_MILLISECONDS,
};

export const trip: DriverTripView = {
  bookingId: unwrap(createBookingId(uuid(31))),
  status: 'accepted',
  destination: { name: 'Lantern Garden' },
  fareInPaise: 6_000,
  rider: { firstName: 'Demo Rider', phone: riderPhone },
};
