import { createConfiguredContainer } from '@infrastructure/composition/container';
import { demoRunProvisionerContract } from '../contract/demo-run-provisioner.contract';
import { unwrap } from '../unit/domain/dispatch/booking.fixtures';
import { createSessionSubject } from '@domain/shared/ids.value-object';
import { registerPostgresScopeTests } from './postgres-scope-isolation.fixtures';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { bookingRepositoryContract } from '../contract/booking-repository.contract';
import { commandLogContract } from '../contract/command-log.contract';
import { driverDeviceRepositoryContract } from '../contract/driver-device-repository.contract';
import { driverInviteRepositoryContract } from '../contract/driver-invite-repository.contract';
import { driverQueueRepositoryContract } from '../contract/driver-queue-repository.contract';
import { eventLogContract } from '../contract/event-log.contract';
import { fareChartRepositoryContract } from '../contract/fare-chart-repository.contract';
import { fareQuoteRepositoryContract } from '../contract/fare-quote-repository.contract';
import { rideOfferRepositoryContract } from '../contract/ride-offer-repository.contract';
import { standRepositoryContract } from '../contract/stand-repository.contract';
import { townRepositoryContract } from '../contract/town-repository.contract';
import { tripRepositoryContract } from '../contract/trip-repository.contract';
import { unitOfWorkContract } from '../contract/unit-of-work.contract';
import { DEMO_STAND, RIDER, TOWN } from '../unit/application/demo-data.fixtures';
import {
  cleanContractDatabase,
  CONTRACT_TOWN,
  prepareContractDatabase,
} from './contract-database.fixtures';
import { offerContractRepository, tripContractRepository } from './dispatch-contract.fixtures';
import {
  dropScopedConnections,
  getScopedConfiguration,
  prepareScopedConnections,
} from './scoped-database.fixtures';
import { registerSessionTests } from './supabase-session.fixtures';
import { registerSupabaseJourney } from './supabase-journey.fixtures';

beforeAll(() => {
  prepareScopedConnections();
});

afterAll(() => {
  dropScopedConnections();
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) cleanContractDatabase();
});

describe('Supabase adapters', () => {
  registerRepositoryContracts();
  unitOfWorkContract(async () => (await prepareContractDatabase('unitOfWork')).unitOfWork);
  demoRunProvisionerContract(async () => {
    await prepareContractDatabase('demoRun');
    return createConfiguredContainer(getScopedConfiguration(), {
      actorContext: {
        getActor: () =>
          Promise.resolve({
            kind: 'anonymous',
            subject: unwrap(createSessionSubject(RIDER)),
            hasDriverDevice: false,
          }),
      },
    });
  });
  registerSupabaseJourney();
  registerSessionTests();
  registerPostgresScopeTests();
});

function registerRepositoryContracts() {
  bookingRepositoryContract(
    async () => (await prepareContractDatabase('bookings')).transaction.bookings,
  );
  commandLogContract(async () => (await prepareContractDatabase('commands')).transaction.commands);
  driverDeviceRepositoryContract(
    async () => (await prepareContractDatabase('devices')).transaction.devices,
  );
  driverInviteRepositoryContract(
    async () => (await prepareContractDatabase('invites')).transaction.invites,
  );
  driverQueueRepositoryContract(
    async () => (await prepareContractDatabase('drivers')).transaction.drivers,
  );
  eventLogContract(async () => {
    const {
      transaction: { events },
    } = await prepareContractDatabase('events');
    return {
      append: (event) => events.append(event),
      list: async () => (await events.list()).filter(({ event }) => event.townId === TOWN),
    };
  });
  fareChartRepositoryContract(
    async () => (await prepareContractDatabase('fareCharts')).transaction.fareCharts,
  );
  fareQuoteRepositoryContract(
    async () => (await prepareContractDatabase('quotes')).transaction.quotes,
  );
  rideOfferRepositoryContract(async () =>
    offerContractRepository(await prepareContractDatabase('offers')),
  );
  standRepositoryContract(async () => (await prepareContractDatabase('stands')).transaction.stands);
  townRepositoryContract(async () => (await prepareContractDatabase('towns')).transaction.towns);
  tripRepositoryContract(async () =>
    tripContractRepository(await prepareContractDatabase('trips')),
  );
}

test('rolls back writes that fail database constraints at commit', async () => {
  const { unitOfWork, transaction } = await prepareContractDatabase('unitOfWork');
  expect(
    await unitOfWork.run(async ({ towns, stands }) => {
      const saved = await towns.save(CONTRACT_TOWN, null);
      if (!saved.ok) return saved;
      return stands.save(DEMO_STAND, null);
    }),
  ).toEqual({ ok: false, error: { code: 'storage_unavailable' } });
  expect(await transaction.towns.get(TOWN)).toBeUndefined();
});
