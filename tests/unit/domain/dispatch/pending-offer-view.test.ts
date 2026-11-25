import { expect, expectTypeOf, it } from 'vitest';
import { projectPendingOfferView } from '@domain/dispatch/pending-offer-view';
import type { PendingOfferView } from '@domain/dispatch/pending-offer-view';
import { revokeDevice } from '@domain/identity/driver-device';
import { err } from '@domain/shared/result';
import * as f from './booking.fixtures';

const input = { driver: f.driverSession, pickupCue: 'Wait beside the entrance.' };

it('I2 exposes only offer ID, pickup Landmark, pickup cue and deadline in its type', () => {
  expectTypeOf<keyof PendingOfferView>().toEqualTypeOf<
    | 'offerId'
    | 'pickupLandmarkId'
    | 'pickupCue'
    | 'expiresAtEpochMilliseconds'
    | 'serverNow'
    | 'remainingMilliseconds'
  >();
});

it('I2 projects only explicitly allowed fields from the private Booking and offer', () => {
  const state = f.makeOffering().state;
  const view = f.unwrap(projectPendingOfferView(state, input, f.at(2)));
  expect(JSON.parse(JSON.stringify(view)) as unknown).toEqual({
    offerId: f.offerId,
    pickupLandmarkId: f.route.pickupLandmarkId,
    pickupCue: input.pickupCue,
    expiresAtEpochMilliseconds: f.offer.expiresAt.epochMilliseconds,
    serverNow: f.at(2).epochMilliseconds,
    remainingMilliseconds: f.offer.expiresAt.epochMilliseconds - f.at(2).epochMilliseconds,
  });
});

it('projects only the offered Driver’s actionable pending Ride offer', () => {
  const now = f.at(2);
  const state = f.makeOffering().state;
  expect(projectPendingOfferView(state, { ...input, driver: f.otherDriverSession }, now)).toEqual(
    err({ code: 'driver_mismatch' }),
  );
  const device = f.unwrap(revokeDevice(f.driverSession.device, now));
  expect(
    projectPendingOfferView(state, { ...input, driver: { ...f.driverSession, device } }, now),
  ).toEqual(err({ code: 'DEVICE_REVOKED' }));
  expect(projectPendingOfferView(state, input, f.offer.expiresAt)).toEqual(
    err({ code: 'offer_expired' }),
  );
  expect(projectPendingOfferView(f.makeAccepted().state, input, now)).toEqual(
    err({ code: 'offer_mismatch' }),
  );
});
