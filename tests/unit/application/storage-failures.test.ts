import { expect, test, vi } from 'vitest';
import { Instant } from '@domain/shared/instant.value-object';
import { NOW_MS, SUBJECT_ONE, DRIVER_ONE, DRIVER_TWO, NEW_SUBJECT } from './demo-data.fixtures';
import { createFaultDemo, expectWriteRollbacks, CONFLICT } from './storage-failures.fixtures';
import {
  acceptRide,
  dispatchRide,
  driverCommand,
  inviteInput,
  quoteInput,
  requestInput,
  requestRide,
  unwrap,
} from './demo.fixtures';

test('failed quote, confirmation, allocation and command log writes roll back', async () => {
  const fixture = await createFaultDemo();
  const { app } = fixture;
  const quote = () => app.quoteFare.execute(quoteInput);
  await expectWriteRollbacks(fixture, quote, ['quotes', 'commands']);
  const { quoteId } = unwrap(await quote());
  const request = () => app.requestRide.execute({ ...requestInput, quoteId });
  await expectWriteRollbacks(fixture, request, ['bookings', 'events']);
  const { bookingId } = unwrap(await request());
  const advance = () => app.advanceDispatch.execute({ bookingId, commandKey: 'offer' });
  await expectWriteRollbacks(fixture, advance, [
    'offers',
    'bookings',
    'events',
    'drivers',
    'commands',
  ]);
  expect(unwrap(await advance()).status).toBe('offering');
});

test('failed acceptance, arrival and completion writes leave their decisions retryable', async () => {
  const fixture = await createFaultDemo();
  const { app } = fixture;
  const { offer, booking } = await dispatchRide(app);
  const accept = () =>
    app.respondToRideOffer.execute({ ...driverCommand, offerId: offer.offerId, action: 'accept' });
  await expectWriteRollbacks(fixture, accept, ['offers', 'trips', 'drivers', 'commands']);
  expect(unwrap(await accept()).status).toBe('accepted');
  const input = { bookingId: booking.bookingId, subject: SUBJECT_ONE };
  const arrive = () => app.markDriverArrived.execute({ ...input, commandKey: 'arrive' });
  await expectWriteRollbacks(fixture, arrive, ['trips']);
  unwrap(await arrive());
  unwrap(await app.startTrip.execute({ ...input, commandKey: 'start' }));
  const complete = () => app.completeTrip.execute({ ...input, commandKey: 'complete' });
  await expectWriteRollbacks(fixture, complete, ['trips', 'events']);
  expect(unwrap(await complete()).status).toBe('completed');
});

test('expiry reconciliation and an offline withdrawal roll back if a dependent write fails', async () => {
  const fixture = await createFaultDemo();
  const { app } = fixture;
  const { offer, booking } = await dispatchRide(app);
  const available = () =>
    app.setDriverAvailability.execute({
      actor: { type: 'driver', subject: SUBJECT_ONE },
      commandKey: 'offline',
      driverId: DRIVER_ONE,
      isOnline: false,
    });
  await expectWriteRollbacks(fixture, available, ['offers']);
  app.clock.set(unwrap(Instant.fromEpochMilliseconds(offer.expiresAtEpochMilliseconds)));
  const advance = () => app.advanceDispatch.execute({ bookingId: booking.bookingId });
  const accept = () =>
    app.respondToRideOffer.execute({ ...driverCommand, offerId: offer.offerId, action: 'accept' });
  await expectWriteRollbacks(fixture, advance, ['offers']);
  await expectWriteRollbacks(fixture, accept, ['bookings']);
  expect(await accept()).toMatchObject({ ok: false, error: { code: 'offer_expired' } });
  expect(unwrap(await available()).availability).toBe('offline');
});

test('retries a dispatch conflict exactly once using a refreshed decision time', async () => {
  const { app, faults } = await createFaultDemo();
  const { bookingId } = await requestRide(app);
  const movePastDeadline = vi
    .fn()
    .mockImplementationOnce(() => {
      app.clock.set(unwrap(Instant.fromEpochMilliseconds(NOW_MS + 90_000)));
      return CONFLICT;
    })
    .mockReturnValue(undefined);
  faults.beforeCommit = () => movePastDeadline() as typeof CONFLICT | undefined;
  const result = await app.advanceDispatch.execute({ bookingId, commandKey: 'offer' });
  expect(result).toMatchObject({
    ok: true,
    value: { status: 'no_driver_found', noDriverFoundReason: 'dispatch_deadline' },
  });
  expect(movePastDeadline).toHaveBeenCalledTimes(2);
  expect((await app.events()).map(({ event }) => event.type)).toEqual([
    'BookingRequested',
    'BookingNoDriverFound',
  ]);
});

test('returns the second dispatch conflict and leaves the command key retryable', async () => {
  const { app, faults } = await createFaultDemo();
  const { bookingId } = await requestRide(app);
  const fail = vi.fn(() => CONFLICT);
  faults.beforeCommit = fail;
  expect(await app.advanceDispatch.execute({ bookingId, commandKey: 'offer' })).toEqual(CONFLICT);
  expect(fail).toHaveBeenCalledTimes(2);
  faults.beforeCommit = () => undefined;
  expect(unwrap(await app.advanceDispatch.execute({ bookingId, commandKey: 'offer' })).status).toBe(
    'offering',
  );
});

test('Driver notification failures keep the committed offer and are logged once', async () => {
  const warn = vi.fn();
  const wakeUp = vi.fn(() => Promise.resolve(false));
  const { app } = await createFaultDemo({ logger: { warn }, notifier: { wakeUp } });
  const { bookingId } = await requestRide(app);
  const input = { bookingId, commandKey: 'offer' };
  const offered = await app.advanceDispatch.execute(input);
  expect(offered).toMatchObject({ ok: true, value: { status: 'offering' } });
  expect(await app.advanceDispatch.execute(input)).toEqual(offered);
  expect(wakeUp).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ driverId: DRIVER_ONE }) as unknown,
  );
  expect(warn).toHaveBeenCalledExactlyOnceWith('driver_notification_failed');
});

test('failed invite issue, redemption and revocation are retryable without partial changes', async () => {
  const fixture = await createFaultDemo();
  const { app } = fixture;
  const issue = () => app.issueDriverInvite.execute(inviteInput);
  await expectWriteRollbacks(fixture, issue, ['invites', 'events']);
  const { url } = unwrap(await issue());
  const bind = () =>
    app.redeemDriverInvite.execute({
      subject: NEW_SUBJECT,
      token: url.split('#')[1],
      commandKey: 'bind',
    });
  await expectWriteRollbacks(fixture, bind, ['invites', 'devices', 'events']);
  expect(unwrap(await bind()).status).toBe('active');
  const revoke = () =>
    app.revokeDriverDevice.execute({ ...inviteInput, driverId: DRIVER_TWO, commandKey: 'revoke' });
  await expectWriteRollbacks(fixture, revoke, ['devices', 'drivers', 'events']);
  expect(unwrap(await revoke()).status).toBe('revoked');
});

test('failed cancelling and rejoining leave the Trip and queue intact', async () => {
  const fixture = await createFaultDemo();
  const { app } = fixture;
  const { booking } = await acceptRide(app);
  const cancel = () =>
    app.cancelBooking.execute({
      actor: { type: 'driver', subject: SUBJECT_ONE },
      bookingId: booking.bookingId,
      commandKey: 'cancel',
    });
  await expectWriteRollbacks(fixture, cancel, ['bookings']);
  expect(unwrap(await cancel()).status).toBe('cancelled_by_driver');
  const rejoin = () => app.rejoinQueue.execute({ subject: SUBJECT_ONE, commandKey: 'rejoin' });
  await expectWriteRollbacks(fixture, rejoin, ['drivers']);
  expect(unwrap(await rejoin()).availability).toBe('online');
});
