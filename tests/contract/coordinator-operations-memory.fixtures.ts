import { createMemoryTransaction } from '@infrastructure/composition/container';
import { InMemoryUnitOfWork } from '@infrastructure/memory/in-memory-unit-of-work';
import { InMemoryCoordinatorDashboardReader } from '@infrastructure/memory/in-memory-coordinator-dashboard-reader';
import { InMemoryDemoComplaintWriter } from '@infrastructure/memory/in-memory-demo-complaint-writer';
import { DEMO_TOWN, SUBJECT_ONE } from '../unit/application/demo-data.fixtures';
import { unwrap } from '../unit/domain/dispatch/booking.fixtures';
import { BOOKING } from './contract-data.fixtures';
import {
  operationsDrivers,
  operationsEvent,
  operationsMembership,
  operationsRuns,
  operationsStands,
} from './coordinator-operations.contract';

export async function prepareMemoryOperations() {
  const memory = new InMemoryUnitOfWork(createMemoryTransaction);
  unwrap(
    await memory.run(async (tx) => {
      unwrap(await tx.towns.save({ ...DEMO_TOWN, demoRuns: operationsRuns }, null));
      for (const stand of operationsStands) unwrap(await tx.stands.save(stand, null));
      for (const driver of operationsDrivers) unwrap(await tx.drivers.save(driver, null));
      unwrap(await tx.events.append(operationsEvent));
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
