import { createTestActorContext } from '../unit/application/test-actor-context.fixtures';
import { expect, test } from 'vitest';
import type { BookingId } from '@domain/shared/ids.value-object';
import type { Transaction } from '@application/ports/unit-of-work';
import { FixedClock } from '@infrastructure/clock/fixed-clock';
import { createConfiguredContainer } from '@infrastructure/composition/container';
import { inviteInput, quoteInput, requestInput, unwrap } from '../unit/application/demo.fixtures';
import {
  DRIVER_ONE,
  NOW,
  RIDER,
  SCOPE,
  STAND,
  SUBJECT_ONE,
} from '../unit/application/demo-data.fixtures';
import { getLocalConfiguration, prepareContractDatabase } from './contract-database.fixtures';

function createSupabaseApp() {
  const configuration = {
    ...getLocalConfiguration(),
    inviteTokenSecret: Buffer.alloc(32, 1).toString('base64'),
  };
  const fixture = createTestActorContext();
  return fixture.wrap(
    createConfiguredContainer(configuration, { clock: new FixedClock(NOW), ...fixture }),
  );
}

export function registerSupabaseJourney() {
  test(
    'redeems an invite through a second server container without re-disclosing it',
    redeemReplayedInvite,
  );

  test('commits and replays a Demo Town ride through the server container', async () => {
    const { transaction } = await prepareContractDatabase('quotes');
    await seedDriver(transaction);
    const app = createSupabaseApp();

    const quote = unwrap(await app.quoteFare.execute(quoteInput));
    const request = { ...requestInput, quoteId: quote.quoteId };
    const { bookingId } = unwrap(await app.requestRide.execute(request));
    expect(
      unwrap(await app.advanceDispatch.execute({ bookingId, commandKey: 'offer' })).status,
    ).toBe('offering');

    const offer = unwrap(await app.getPendingOfferForDriver.execute({ subject: SUBJECT_ONE }));
    if (!offer) throw new Error('Expected a pending Ride offer');
    const acceptance = {
      offerId: offer.offerId,
      subject: SUBJECT_ONE,
      action: 'accept',
      commandKey: 'accept',
    };
    const accepted = await app.respondToRideOffer.execute(acceptance);
    expect(unwrap(accepted).status).toBe('accepted');
    expect(await app.respondToRideOffer.execute(acceptance)).toEqual(accepted);

    await finishTrip(app, bookingId);
    expect(
      unwrap(await app.getBookingStatusForRider.execute({ bookingId, riderId: RIDER })).status,
    ).toBe('completed');
    expect(await transaction.trips.findActiveByDriver(DRIVER_ONE)).toBeUndefined();
    const events = (await transaction.events.list()).filter(
      ({ event }) => event.demoRunId === SCOPE.demoRunId,
    );
    expect(events.filter(({ event }) => event.type === 'RideOfferAccepted')).toHaveLength(1);
    expect(events.some(({ event }) => event.type === 'TripCompleted')).toBe(true);
  });
}

async function redeemReplayedInvite() {
  const { transaction } = await prepareContractDatabase('invites');
  unwrap(
    await transaction.drivers.save(
      { ...SCOPE, entry: { driverId: DRIVER_ONE, standId: STAND, availability: 'offline' } },
      null,
    ),
  );

  const input = { ...inviteInput, driverId: DRIVER_ONE };
  const issued = unwrap(await createSupabaseApp().issueDriverInvite.execute(input));
  const secondApp = createSupabaseApp();
  const replayed = await secondApp.issueDriverInvite.execute(input);
  const redeemed = await secondApp.redeemDriverInvite.execute({
    token: issued.url.split('#')[1],
    subject: SUBJECT_ONE,
    commandKey: 'redeem-invite',
  });

  expect(redeemed).toEqual({ ok: true, value: { status: 'active', driverId: DRIVER_ONE } });
  expect(replayed).toMatchObject({ ok: false, error: { code: 'invite_already_issued' } });
  const events = (await transaction.events.list()).filter(
    ({ event }) => event.demoRunId === SCOPE.demoRunId,
  );
  expect(events.filter(({ event }) => event.type === 'DriverInviteIssued')).toHaveLength(1);
}

async function seedDriver({ devices, drivers }: Transaction) {
  unwrap(
    await devices.save(
      { driverId: DRIVER_ONE, subject: SUBJECT_ONE, boundAt: NOW, status: 'active' },
      null,
    ),
  );
  unwrap(
    await drivers.save(
      {
        ...SCOPE,
        entry: { driverId: DRIVER_ONE, standId: STAND, availability: 'online', queuedAt: 1n },
      },
      null,
    ),
  );
}

async function finishTrip(app: ReturnType<typeof createConfiguredContainer>, bookingId: BookingId) {
  const trip = { bookingId, subject: SUBJECT_ONE };
  unwrap(await app.markDriverArrived.execute({ ...trip, commandKey: 'arrive' }));
  unwrap(await app.startTrip.execute({ ...trip, commandKey: 'start' }));
  unwrap(await app.completeTrip.execute({ ...trip, commandKey: 'complete' }));
}
