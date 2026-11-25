import { expect, test } from 'vitest';
import type { SessionActor } from '@application/ports/actor-context';
import {
  createSessionSubject,
  createStandId,
  type SessionSubject,
} from '@domain/shared/ids.value-object';
import { Instant } from '@domain/shared/instant.value-object';
import { FixedClock } from '@infrastructure/clock/fixed-clock';
import { createConfiguredContainer } from '@infrastructure/composition/container';
import { DEMO_STAND, RIDER, SUBJECT_TWO, TOWN } from '../unit/application/demo-data.fixtures';
import { quoteInput, unwrap } from '../unit/application/demo.fixtures';
import { prepareContractDatabase, runLocalSql } from './contract-database.fixtures';
import { getScopedConfiguration } from './scoped-database.fixtures';

const RESPONSE_MILLISECONDS = 2_000;
const TRIP_STEP_MILLISECONDS = 5_000;

export function registerDemoRunIsolationTest() {
  test(
    'advances simultaneous Demo Runs to different outcomes without sharing the roster or bookings',
    verifyIsolation,
  );
}

async function verifyIsolation() {
  const { transaction } = await prepareContractDatabase('quotes');
  const { pickupCues, coordinatorContact } = DEMO_STAND;
  const standId = unwrap(createStandId('10000000-0000-4000-8000-000000000191'));
  unwrap(
    await transaction.stands.save(
      { townId: TOWN, standId, pickupCues, coordinatorContact, neighbourStandIds: [] },
      null,
    ),
  );
  runLocalSql(
    `update auth.users set is_anonymous = true where id in ('${RIDER}', '${SUBJECT_TWO}')`,
  );
  const clock = new FixedClock(unwrap(Instant.fromEpochMilliseconds(Date.now())));
  const firstRider = unwrap(createSessionSubject(RIDER));
  const [first, second] = await Promise.all([
    bookRun(clock, { standId, subject: firstRider, scenario: 'successful_trip' }),
    bookRun(clock, { standId, subject: SUBJECT_TWO, scenario: 'queue_exhaustion' }),
  ]);
  expect(first.run.demoRunId).not.toBe(second.run.demoRunId);
  expect(first.run.standId).not.toBe(second.run.standId);
  const dispatcher = createApp({ kind: 'sweep' }, clock);
  const advanceBoth = () =>
    Promise.all(
      [first, second].map(
        async ({ bookingId }) =>
          unwrap(await dispatcher.advanceDispatch.execute({ bookingId })).status,
      ),
    );
  expect(await advanceBoth()).toEqual(['offering', 'offering']);
  tick(clock, RESPONSE_MILLISECONDS);
  expect(await advanceBoth()).toEqual(['accepted', 'requested']);
  tick(clock, TRIP_STEP_MILLISECONDS);
  expect(await advanceBoth()).toEqual(['driver_arrived', 'no_driver_found']);
  tick(clock, TRIP_STEP_MILLISECONDS);
  expect(await advanceBoth()).toEqual(['in_trip', 'no_driver_found']);
  tick(clock, TRIP_STEP_MILLISECONDS);
  expect(await advanceBoth()).toEqual(['completed', 'no_driver_found']);
}

async function bookRun(
  clock: FixedClock,
  {
    subject,
    standId,
    scenario,
  }: {
    subject: SessionSubject;
    standId: string;
    scenario: 'successful_trip' | 'queue_exhaustion';
  },
) {
  const app = createApp({ kind: 'anonymous', subject, hasDriverDevice: false }, clock);
  const run = unwrap(await app.startDemoRun.execute({ townId: TOWN, standId, scenario }));
  const { quoteId } = unwrap(
    await app.quoteFare.execute({ ...quoteInput, demoRunId: run.demoRunId }),
  );
  const { bookingId } = unwrap(
    await app.requestRide.execute({
      quoteId,
      standId: run.standId,
      commandKey: 'book-run',
    }),
  );
  return { run, bookingId };
}

function createApp(actor: SessionActor, clock: FixedClock) {
  return createConfiguredContainer(getScopedConfiguration(), {
    actorContext: { getActor: () => Promise.resolve(actor) },
    clock,
  });
}

function tick(clock: FixedClock, durationMilliseconds: number) {
  clock.set(
    unwrap(Instant.fromEpochMilliseconds(clock.now().epochMilliseconds + durationMilliseconds)),
  );
}
