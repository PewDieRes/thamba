import { expect, test } from 'vitest';
import { money } from '../domain/dispatch/booking.fixtures';
import {
  FARE_CHART,
  HOUR_MS,
  MALVAN,
  NOW_MS,
  OTHER_SUBJECT,
  RIDER,
  SUBJECT_ONE,
} from './demo-data.fixtures';
import { createDemo, dispatchRide, quoteInput, requestInput, unwrap } from './demo.fixtures';
import {
  MINUTE_MS,
  LEAD_TIME_MS,
  OTHER_STAND,
  at,
  write,
  suspendTown,
  schedule,
} from './dispatch-edge.fixtures';

test('a just-due schedule activates at the serialized time and keeps its confirmed fare', async () => {
  const app = await createDemo();
  const { bookingId } = await schedule(app);
  at(app, HOUR_MS - LEAD_TIME_MS - 1);
  expect(unwrap(await app.advanceDispatch.execute({ bookingId })).status).toBe('scheduled');
  await write(app, ({ fareCharts }) =>
    fareCharts.save(
      {
        ...FARE_CHART,
        version: 2,
        routes: FARE_CHART.routes.map((fare) => ({ ...fare, fare: money(9900) })),
      },
      1,
    ),
  );
  at(app, HOUR_MS - LEAD_TIME_MS);
  expect(unwrap(await app.advanceDispatch.execute({ bookingId })).status).toBe('offering');
  const actual = (await app.events()).find(({ event }) => event.type === 'BookingRequested');
  expect(actual?.event.occurredAt.epochMilliseconds).toBe(NOW_MS + HOUR_MS - LEAD_TIME_MS);
  expect(
    unwrap(await app.getBookingStatusForRider.execute({ bookingId, riderId: RIDER })).fareInPaise,
  ).toBe(7000);
  expect(unwrap(await app.getTownOverview.execute({ slug: 'demo-town' })).fares).toHaveLength(1);
});

test('Town authority closes a due schedule and an outstanding offer', async () => {
  const scheduledApp = await createDemo();
  const scheduled = await schedule(scheduledApp, MINUTE_MS);
  await suspendTown(scheduledApp);
  expect(
    unwrap(await scheduledApp.advanceDispatch.execute({ bookingId: scheduled.bookingId })),
  ).toMatchObject({
    status: 'no_driver_found',
    noDriverFoundReason: 'booking_unavailable',
  });
  const app = await createDemo();
  const { booking } = await dispatchRide(app);
  await suspendTown(app);
  expect(
    unwrap(await app.getPendingOfferForDriver.execute({ subject: SUBJECT_ONE })),
  ).toBeUndefined();
  expect(unwrap(await app.advanceDispatch.execute({ bookingId: booking.bookingId }))).toMatchObject(
    {
      status: 'no_driver_found',
      noDriverFoundReason: 'booking_unavailable',
    },
  );
  expect((await app.events()).map(({ event }) => event.type)).toContain('RideOfferWithdrawn');
});

test('rejects past pickups, missing fare data and invalid passenger counts', async () => {
  const app = await createDemo();
  expect(await app.quoteFare.execute({ ...quoteInput, passengers: 0 })).toMatchObject({
    ok: false,
    error: { code: 'invalid_input' },
  });
  expect(
    await app.quoteFare.execute({
      ...quoteInput,
      commandKey: 'past',
      pickupAtEpochMilliseconds: NOW_MS,
    }),
  ).toMatchObject({ ok: false, error: { code: 'pickup_not_in_future' } });
  expect(
    await app.quoteFare.execute({ ...quoteInput, commandKey: 'wrong town', townId: MALVAN }),
  ).toMatchObject({ ok: false, error: { code: 'not_found' } });
});

test('validates quote ownership, the Stand and Town capability on confirmation', async () => {
  const app = await createDemo();
  const quote = unwrap(await app.quoteFare.execute(quoteInput));
  const input = { ...requestInput, quoteId: quote.quoteId };
  expect(await app.scheduleRide.execute(input)).toMatchObject({
    ok: false,
    error: { code: 'quote_pickup_mismatch' },
  });
  expect(await app.requestRide.execute({ ...input, standId: OTHER_STAND })).toMatchObject({
    ok: false,
    error: { code: 'not_found' },
  });
  expect(await app.requestRide.execute({ ...input, riderId: OTHER_SUBJECT })).toMatchObject({
    ok: false,
    error: { code: 'not_found' },
  });
  expect(await app.getTownOverview.execute({ slug: 'unknown' })).toMatchObject({
    ok: false,
    error: { code: 'not_found' },
  });
  await suspendTown(app);
  expect(await app.quoteFare.execute({ ...quoteInput, commandKey: 'unavailable' })).toMatchObject({
    ok: false,
    error: { code: 'TOWN_NOT_BOOKABLE' },
  });
  expect(await app.requestRide.execute(input)).toMatchObject({
    ok: false,
    error: { code: 'booking_unavailable' },
  });
});

test('superseded and expired quotes require explicit reconfirmation and replay the same replacement', async () => {
  const app = await createDemo();
  const quote = unwrap(await app.quoteFare.execute(quoteInput));
  const input = { ...requestInput, quoteId: quote.quoteId };
  await write(app, ({ fareCharts }) => fareCharts.save({ ...FARE_CHART, version: 2 }, 1));
  const stale = await app.requestRide.execute(input);
  expect(stale).toMatchObject({
    ok: false,
    error: { code: 'stale_quote', freshQuote: { fareChartVersion: 2 } },
  });
  expect(await app.requestRide.execute(input)).toEqual(stale);
  expect(await app.events()).toEqual([]);
  const scheduledQuote = unwrap(
    await app.quoteFare.execute({
      ...quoteInput,
      commandKey: 'scheduled quote',
      pickupAtEpochMilliseconds: NOW_MS + HOUR_MS,
    }),
  );
  at(app, HOUR_MS / 2);
  expect(
    await app.scheduleRide.execute({
      ...input,
      quoteId: scheduledQuote.quoteId,
      commandKey: 'schedule',
    }),
  ).toMatchObject({
    ok: false,
    error: { code: 'stale_quote', freshQuote: { fareChartVersion: 2 } },
  });
});

test('only the Rider assigned to a Demo Town run can obtain its fare quote', async () => {
  const app = await createDemo();
  const other = { ...quoteInput, riderId: OTHER_SUBJECT };
  expect(await app.quoteFare.execute(other)).toMatchObject({
    ok: false,
    error: { code: 'TOWN_NOT_BOOKABLE' },
  });
  expect(await app.quoteFare.execute(quoteInput)).toMatchObject({ ok: true });
});
