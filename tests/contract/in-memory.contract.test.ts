import { demoRunProvisionerContract } from './demo-run-provisioner.contract';
import { DEMO_TOWN } from '../unit/application/demo-data.fixtures';
import { unwrap } from '../unit/domain/dispatch/booking.fixtures';
import { describe } from 'vitest';
import {
  createInMemoryContainer,
  createMemoryTransaction,
} from '@infrastructure/composition/container';
import { MemoryStore } from '@infrastructure/memory/memory-store';
import { bookingRepositoryContract } from './booking-repository.contract';
import { rideOfferRepositoryContract } from './ride-offer-repository.contract';
import { driverQueueRepositoryContract } from './driver-queue-repository.contract';
import { standRepositoryContract } from './stand-repository.contract';
import { townRepositoryContract } from './town-repository.contract';
import { fareChartRepositoryContract } from './fare-chart-repository.contract';
import { fareQuoteRepositoryContract } from './fare-quote-repository.contract';
import { tripRepositoryContract } from './trip-repository.contract';
import { driverInviteRepositoryContract } from './driver-invite-repository.contract';
import { driverDeviceRepositoryContract } from './driver-device-repository.contract';
import { commandLogContract } from './command-log.contract';
import { eventLogContract } from './event-log.contract';
import { unitOfWorkContract } from './unit-of-work.contract';

describe('in-memory adapters', () => {
  bookingRepositoryContract(() => createMemoryTransaction(new MemoryStore()).bookings);
  rideOfferRepositoryContract(() => createMemoryTransaction(new MemoryStore()).offers);
  driverQueueRepositoryContract(() => createMemoryTransaction(new MemoryStore()).drivers);
  standRepositoryContract(() => createMemoryTransaction(new MemoryStore()).stands);
  townRepositoryContract(() => createMemoryTransaction(new MemoryStore()).towns);
  fareChartRepositoryContract(() => createMemoryTransaction(new MemoryStore()).fareCharts);
  fareQuoteRepositoryContract(() => createMemoryTransaction(new MemoryStore()).quotes);
  tripRepositoryContract(() => createMemoryTransaction(new MemoryStore()).trips);
  driverInviteRepositoryContract(() => createMemoryTransaction(new MemoryStore()).invites);
  driverDeviceRepositoryContract(() => createMemoryTransaction(new MemoryStore()).devices);
  commandLogContract(() => createMemoryTransaction(new MemoryStore()).commands);
  eventLogContract(() => createMemoryTransaction(new MemoryStore()).events);
  demoRunProvisionerContract(async () => {
    const app = createInMemoryContainer();
    unwrap(
      await app.unitOfWork.run(({ towns }) => towns.save({ ...DEMO_TOWN, demoRuns: [] }, null)),
    );
    return app;
  });
  unitOfWorkContract(() => createInMemoryContainer().unitOfWork);
});
