import { expect, test } from 'vitest';
import {
  COORDINATOR,
  DRIVER_ONE,
  OTHER_SUBJECT,
  RIDER,
  STAND,
  SUBJECT_ONE,
  SUBJECT_TWO,
} from './demo-data.fixtures';
import { acceptRide, createDemo, dispatchRide, unwrap } from './demo.fixtures';
import { OTHER_STAND, suspendTown } from './dispatch-edge.fixtures';

test('a Driver can cancel an active Trip and the Rider cannot restart the Booking', async () => {
  const app = await createDemo();
  const { booking } = await acceptRide(app);
  const { bookingId } = booking;
  expect(
    await app.markDriverArrived.execute({ bookingId, subject: SUBJECT_TWO, commandKey: 'arrive' }),
  ).toMatchObject({ ok: false, error: { code: 'not_found' } });
  expect(
    await app.startTrip.execute({ bookingId, subject: SUBJECT_ONE, commandKey: 'start' }),
  ).toMatchObject({ ok: false, error: { code: 'illegal_transition' } });
  expect(
    unwrap(
      await app.cancelBooking.execute({
        actor: { type: 'driver', subject: SUBJECT_ONE },
        bookingId,
        commandKey: 'cancel',
      }),
    ).status,
  ).toBe('cancelled_by_driver');
  expect(
    await app.cancelBooking.execute({
      actor: { type: 'rider', riderId: RIDER },
      bookingId,
      commandKey: 'cancel',
    }),
  ).toMatchObject({ ok: false, error: { code: 'illegal_transition' } });
  expect(
    await app.rejoinQueue.execute({ subject: OTHER_SUBJECT, commandKey: 'join' }),
  ).toMatchObject({ ok: false, error: { code: 'not_found' } });
});

test('Coordinator skip resolves the reservation and records the reason after authority lapses', async () => {
  const app = await createDemo();
  const { booking, offer } = await dispatchRide(app);
  await suspendTown(app);
  const actor = { type: 'stand_coordinator', standId: STAND, coordinatorId: COORDINATOR };
  const input = { actor, driverId: DRIVER_ONE, isOnline: false, commandKey: 'skip' };
  expect(await app.setDriverAvailability.execute(input)).toMatchObject({
    ok: false,
    error: { code: 'invalid_input' },
  });
  expect(
    await app.setDriverAvailability.execute({
      ...input,
      actor: { ...actor, standId: OTHER_STAND },
      reason: 'skip',
    }),
  ).toMatchObject({ ok: false, error: { code: 'forbidden' } });
  expect(
    unwrap(await app.setDriverAvailability.execute({ ...input, reason: 'skip' })).availability,
  ).toBe('offline');
  expect(
    unwrap(
      await app.getBookingStatusForRider.execute({ bookingId: booking.bookingId, riderId: RIDER }),
    ).status,
  ).toBe('no_driver_found');
  expect((await app.events()).at(-1)?.event).toMatchObject({
    type: 'DriverQueueChanged',
    availabilityReason: 'skip',
  });
  expect(
    await app.respondToRideOffer.execute({
      offerId: offer.offerId,
      subject: SUBJECT_ONE,
      action: 'decline',
      commandKey: 'late',
    }),
  ).toMatchObject({ ok: false, error: { code: 'offer_mismatch' } });
});

test('joining twice preserves queue position and skipping an open slot records one removal', async () => {
  const app = await createDemo();
  const online = unwrap(
    await app.rejoinQueue.execute({ subject: SUBJECT_ONE, commandKey: 'join' }),
  );
  expect(
    unwrap(await app.rejoinQueue.execute({ subject: SUBJECT_ONE, commandKey: 'join-again' })),
  ).toEqual(online);
  const actor = { type: 'stand_coordinator', standId: STAND, coordinatorId: COORDINATOR };
  const input = { actor, driverId: DRIVER_ONE, isOnline: false, reason: 'walk_up' };
  unwrap(await app.setDriverAvailability.execute({ ...input, commandKey: 'skip' }));
  unwrap(await app.setDriverAvailability.execute({ ...input, commandKey: 'skip-again' }));
  expect((await app.events()).map(({ event }) => event)).toMatchObject([
    { type: 'DriverQueueChanged', reason: 'walk_up' },
  ]);
});
