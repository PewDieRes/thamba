import { expect, test, vi } from 'vitest';
import type { ApplicationResult } from '@application/ports/application-result';
import { Instant } from '@domain/shared/instant.value-object';
import {
  DESTINATION,
  RIDER,
  STAND_CONTACT,
  SUBJECT_ONE,
  SUBJECT_TWO,
  NOW_MS,
  HOUR_MS,
} from './demo-data.fixtures';
import {
  createDemo,
  quoteInput,
  requestInput,
  requestRide,
  unwrap,
  type Demo,
} from './demo.fixtures';

function recordCommands() {
  const commands: {
    execute: () => Promise<ApplicationResult<unknown>>;
    committed: ApplicationResult<unknown>;
  }[] = [];
  return {
    commands,
    run: async <T>(execute: () => Promise<ApplicationResult<T>>) => {
      const committed = await execute();
      commands.push({ execute, committed });
      return unwrap(committed);
    },
  };
}

async function getOffer(app: Demo, subject: typeof SUBJECT_ONE) {
  const offer = unwrap(await app.getPendingOfferForDriver.execute({ subject }));
  if (!offer) throw new Error('Expected a pending Ride offer');
  return offer;
}

async function bookAndAccept(app: Demo, run: ReturnType<typeof recordCommands>['run']) {
  const quote = await run(() => app.quoteFare.execute(quoteInput));
  const { bookingId } = await run(() =>
    app.requestRide.execute({ ...requestInput, quoteId: quote.quoteId }),
  );
  await run(() => app.advanceDispatch.execute({ bookingId, commandKey: 'offer-one' }));
  const first = await getOffer(app, SUBJECT_ONE);
  await run(() =>
    app.respondToRideOffer.execute({
      offerId: first.offerId,
      subject: SUBJECT_ONE,
      commandKey: 'decline',
      action: 'decline',
    }),
  );
  await run(() => app.advanceDispatch.execute({ bookingId, commandKey: 'offer-two' }));
  const second = await getOffer(app, SUBJECT_TWO);
  const trip = { bookingId, subject: SUBJECT_TWO };
  await run(() =>
    app.respondToRideOffer.execute({
      offerId: second.offerId,
      subject: SUBJECT_TWO,
      commandKey: 'accept',
      action: 'accept',
    }),
  );
  return trip;
}

async function finishTrip(
  app: Demo,
  trip: Awaited<ReturnType<typeof bookAndAccept>>,
  run: ReturnType<typeof recordCommands>['run'],
) {
  await run(() => app.markDriverArrived.execute({ ...trip, commandKey: 'arrive' }));
  await run(() => app.startTrip.execute({ ...trip, commandKey: 'start' }));
  await run(() => app.completeTrip.execute({ ...trip, commandKey: 'complete' }));
  await run(() => app.rejoinQueue.execute({ subject: trip.subject, commandKey: 'rejoin' }));
}

function expectJourneyEvents(events: Awaited<ReturnType<Demo['events']>>) {
  expect(events.map(({ event }) => event.type)).toEqual([
    'BookingRequested',
    'RideOfferCreated',
    'DriverQueueChanged',
    'RideOfferDeclined',
    'DriverQueueChanged',
    'RideOfferCreated',
    'DriverQueueChanged',
    'RideOfferAccepted',
    'BookingAccepted',
    'TripCreated',
    'DriverQueueChanged',
    'DriverArrived',
    'TripStarted',
    'TripCompleted',
    'DriverQueueChanged',
  ]);
  expect(new Set(events.map(({ eventId }) => eventId)).size).toBe(events.length);
}

test('Demo Town journey replays each committed command without new events or notifications', async () => {
  const wakeUp = vi.fn(() => Promise.resolve(true));
  const app = await createDemo({ notifier: { wakeUp } });
  const { run, commands } = recordCommands();
  const trip = await bookAndAccept(app, run);
  await finishTrip(app, trip, run);
  const { bookingId } = trip;
  const status = unwrap(await app.getBookingStatusForRider.execute({ bookingId, riderId: RIDER }));
  expect(status).toMatchObject({
    status: 'completed',
    fareInPaise: 7000,
    route: { destinationLandmarkId: DESTINATION },
  });

  const events = await app.events();
  expectJourneyEvents(events);
  app.clock.set(unwrap(Instant.fromEpochMilliseconds(NOW_MS + HOUR_MS)));
  for (const { execute, committed } of commands) expect(await execute()).toEqual(committed);
  expect(await app.quoteFare.execute({ ...quoteInput, passengers: 2 })).toEqual({
    ok: false,
    error: { code: 'idempotency_key_reused' },
  });
  expect(await app.events()).toEqual(events);
  expect(wakeUp).toHaveBeenCalledTimes(2);
});

test('Demo Town search ends at the original Stand contact after both Drivers decline', async () => {
  const app = await createDemo();
  const { bookingId } = await requestRide(app);
  for (const subject of [SUBJECT_ONE, SUBJECT_TWO]) {
    expect(unwrap(await app.advanceDispatch.execute({ bookingId })).status).toBe('offering');
    const offer = await getOffer(app, subject);
    unwrap(
      await app.respondToRideOffer.execute({
        subject,
        offerId: offer.offerId,
        action: 'decline',
        commandKey: 'decline',
      }),
    );
  }
  const exhausted = unwrap(await app.advanceDispatch.execute({ bookingId }));
  expect(exhausted).toEqual({
    bookingId,
    status: 'no_driver_found',
    noDriverFoundReason: 'stands_exhausted',
  });
  expect(
    unwrap(await app.getBookingStatusForRider.execute({ bookingId, riderId: RIDER })),
  ).toMatchObject({
    status: 'no_driver_found',
    noDriverFoundReason: 'stands_exhausted',
    coordinatorContact: STAND_CONTACT,
  });
  const events = await app.events();
  expect(unwrap(await app.advanceDispatch.execute({ bookingId }))).toEqual(exhausted);
  expect(await app.events()).toEqual(events);
});
