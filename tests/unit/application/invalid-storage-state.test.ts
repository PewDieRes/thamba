import { expect, test } from 'vitest';
import { createStandId } from '@domain/shared/ids.value-object';
import { Instant } from '@domain/shared/instant.value-object';
import { DRIVER_ONE, NEW_SUBJECT, RIDER, SUBJECT_ONE, uuid } from './demo-data.fixtures';
import {
  createDemo,
  dispatchRide,
  driverCommand,
  inviteInput,
  quoteInput,
  unwrap,
} from './demo.fixtures';
import { createFaultDemo, replaceMethod } from './storage-failures.fixtures';

test('does not issue an invite or revoke a device for a Driver outside the verified Stand', async () => {
  const app = await createDemo();
  const wrongStand = unwrap(createStandId(uuid(80)));
  expect(
    await app.issueDriverInvite.execute({ ...inviteInput, standId: wrongStand }),
  ).toMatchObject({ ok: false, error: { code: 'not_found' } });
  expect(
    await app.revokeDriverDevice.execute({
      ...inviteInput,
      standId: wrongStand,
      driverId: DRIVER_ONE,
    }),
  ).toMatchObject({ ok: false, error: { code: 'not_found' } });
});

test('translation of injected hashing and clock failures returns typed results', async () => {
  const hashing = await createDemo({ hasher: { hash: () => 'invalid' } });
  expect(await hashing.issueDriverInvite.execute(inviteInput)).toMatchObject({
    ok: false,
    error: { code: 'inconsistent_state' },
  });
  expect(
    await hashing.redeemDriverInvite.execute({
      subject: NEW_SUBJECT,
      token: 'unusable',
      commandKey: 'bind',
    }),
  ).toMatchObject({ ok: false, error: { code: 'not_found' } });
  const clock = await createDemo();
  clock.clock.set(unwrap(Instant.fromEpochMilliseconds(Number.MAX_SAFE_INTEGER)));
  expect(await clock.quoteFare.execute(quoteInput)).toMatchObject({
    ok: false,
    error: { code: 'invalid_expiry' },
  });
  expect(await clock.issueDriverInvite.execute(inviteInput)).toMatchObject({
    ok: false,
    error: { code: 'invalid_expiry' },
  });
});

test('a missing reservation row blocks acceptance and withdrawal', async () => {
  const { app, faults } = await createFaultDemo();
  const { offer } = await dispatchRide(app);
  faults.changePorts = (tx) => ({
    ...tx,
    drivers: replaceMethod(tx.drivers, 'get', () => Promise.resolve(undefined)),
  });
  expect(
    await app.respondToRideOffer.execute({
      ...driverCommand,
      offerId: offer.offerId,
      action: 'accept',
    }),
  ).toMatchObject({ ok: false, error: { code: 'driver_not_reserved' } });
  expect(
    await app.respondToRideOffer.execute({
      ...driverCommand,
      offerId: offer.offerId,
      action: 'decline',
    }),
  ).toMatchObject({ ok: false, error: { code: 'inconsistent_state' } });
  faults.changePorts = (tx) => ({
    ...tx,
    offers: replaceMethod(tx.offers, 'findPendingByDriver', () => Promise.resolve(undefined)),
  });
  expect(
    await app.setDriverAvailability.execute({
      actor: { type: 'driver', subject: SUBJECT_ONE },
      driverId: DRIVER_ONE,
      commandKey: 'offline',
      isOnline: false,
    }),
  ).toMatchObject({ ok: false, error: { code: 'inconsistent_state' } });
});

test('Driver-only commands reject an unbound subject', async () => {
  const app = await createDemo();
  const { booking, offer } = await dispatchRide(app);
  expect(
    await app.respondToRideOffer.execute({
      ...driverCommand,
      subject: NEW_SUBJECT,
      offerId: offer.offerId,
      action: 'decline',
    }),
  ).toMatchObject({ ok: false, error: { code: 'not_found' } });
  expect(
    await app.markDriverArrived.execute({
      bookingId: booking.bookingId,
      subject: NEW_SUBJECT,
      commandKey: 'arrive',
    }),
  ).toMatchObject({ ok: false, error: { code: 'not_found' } });
  expect(
    await app.setDriverAvailability.execute({
      actor: { type: 'driver', subject: NEW_SUBJECT },
      driverId: DRIVER_ONE,
      commandKey: 'offline',
      isOnline: false,
    }),
  ).toMatchObject({ ok: false, error: { code: 'not_found' } });
  expect(
    unwrap(
      await app.getBookingStatusForRider.execute({ bookingId: booking.bookingId, riderId: RIDER }),
    ).status,
  ).toBe('offering');
});
