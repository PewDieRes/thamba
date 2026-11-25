import { createMemoryTransaction } from '@infrastructure/composition/container';
import { InMemoryUnitOfWork } from '@infrastructure/memory/in-memory-unit-of-work';
import { InMemoryCoordinatorDashboardReader } from '@infrastructure/memory/in-memory-coordinator-dashboard-reader';
import { InMemoryDemoComplaintWriter } from '@infrastructure/memory/in-memory-demo-complaint-writer';
import { DEMO_TOWN, SCOPE, SUBJECT_ONE } from '../unit/application/demo-data.fixtures';
import { unwrap } from '../unit/domain/dispatch/booking.fixtures';
import { BOOKING, OFFER, TRIP } from './contract-data.fixtures';
import {
  type InvitationState,
  operationsDevice,
  operationsDrivers,
  operationsEvent,
  operationsMembership,
  operationsRuns,
  operationsStands,
} from './coordinator-operations.contract';

export async function prepareMemoryOperations(state: InvitationState = 'free') {
  const memory = new InMemoryUnitOfWork(createMemoryTransaction);
  unwrap(
    await memory.run(async (tx) => {
      unwrap(await tx.towns.save({ ...DEMO_TOWN, demoRuns: operationsRuns }, null));
      for (const stand of operationsStands) unwrap(await tx.stands.save(stand, null));
      for (const driver of operationsDrivers) unwrap(await tx.drivers.save(driver, null));
      unwrap(await tx.events.append(operationsEvent));
      if (state === 'bound') unwrap(await tx.devices.save(operationsDevice, null));
      if (state === 'offering')
        unwrap(await tx.offers.save({ ...SCOPE, offer: OFFER, status: 'pending' }, null));
      if (state === 'on_trip') unwrap(await tx.trips.save(TRIP, null));
      return tx.bookings.save(BOOKING, null);
    }),
  );
  return {
    dashboard: new InMemoryCoordinatorDashboardReader(() => memory.readSnapshot(), {
      getActor: () =>
        Promise.resolve({
          kind: 'coordinator',
          subject: SUBJECT_ONE,
          memberships: [operationsMembership],
        }),
    }),
    complaints: new InMemoryDemoComplaintWriter(memory),
  };
}
