import { FixedClock } from '@infrastructure/clock/fixed-clock';
import { NOW } from '../../demo-data.fixtures';
import { Instant } from '@domain/shared/instant.value-object';
import { createBookingId, type BookingId } from '@domain/shared/ids.value-object';
import { ok } from '@domain/shared/result';
import { expect, test } from 'vitest';
import { createDemo, requestRide, unwrap } from '../../demo.fixtures';

test('advances due Bookings through the existing dispatch use case', async () => {
  const app = await createDemo();
  const booking = await requestRide(app);
  await expect(app.sweepDispatch.execute({ batch: 'due' })).resolves.toEqual({
    ok: true,
    value: { attempted: 1, advanced: 1, failed: 0 },
  });
  await expect(app.sweepDispatch.execute({ batch: 'due' })).resolves.toEqual({
    ok: true,
    value: { attempted: 0, advanced: 0, failed: 0 },
  });
  expect(booking.status).toBe('requested');
});

test('counts failures and continues through the rest of the batch', async () => {
  let due: readonly BookingId[] = [];
  const app = await createDemo({ dueBookings: { listDue: () => Promise.resolve(ok(due)) } });
  const booking = await requestRide(app);
  due = [unwrap(createBookingId('30000000-0000-4000-8000-000000000001')), booking.bookingId];
  expect(await app.sweepDispatch.execute({ batch: 'due' })).toEqual({
    ok: true,
    value: { attempted: 2, advanced: 1, failed: 1 },
  });
});

test('fails closed when Postgres cannot list due Bookings', async () => {
  const app = await createDemo({
    dueBookings: {
      listDue: () => Promise.resolve({ ok: false, error: { code: 'storage_unavailable' } }),
    },
  });
  expect(await app.sweepDispatch.execute({ batch: 'due' })).toEqual({
    ok: false,
    error: { code: 'storage_unavailable' },
  });
});

test('stops when the time budget expires while the due query is in flight', async () => {
  const clock = new FixedClock(NOW);
  let due: readonly BookingId[] = [];
  const app = await createDemo({
    clock,
    dueBookings: {
      listDue: () => {
        clock.set(unwrap(Instant.fromEpochMilliseconds(NOW.epochMilliseconds + 8_000)));
        return Promise.resolve(ok(due));
      },
    },
  });
  const booking = await requestRide(app);
  due = [booking.bookingId];
  expect(await app.sweepDispatch.execute({ batch: 'due' })).toEqual({
    ok: true,
    value: { attempted: 0, advanced: 0, failed: 0 },
  });
});
