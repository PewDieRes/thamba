import type { UnitOfWork } from '@application/ports/unit-of-work';
import { FixedClock } from '@infrastructure/clock/fixed-clock';
import { createInMemoryContainer } from '@infrastructure/composition/container';
import { InMemoryMatchedRiderContactReader } from '@infrastructure/memory/in-memory-matched-rider-contact-reader';
import { revokeDevice } from '@domain/identity/driver-device';
import type { ActiveDriverDevice } from '@domain/identity/driver-device';
import {
  DRIVER_ONE,
  DRIVER_TWO,
  MALVAN,
  NOW,
  SCOPE,
  STAND,
  SUBJECT_ONE,
  SUBJECT_TWO,
} from '../unit/application/demo-data.fixtures';
import { unwrap } from '../unit/domain/dispatch/booking.fixtures';
import { BOOKING_ID, DEADLINE, TRIP } from './contract-data.fixtures';
import {
  OTHER_TOWN_COORDINATOR_SUBJECT,
  RIDER_CONTACT,
  TOWN_COORDINATOR_SUBJECT,
  type ContactFixtureState,
} from './matched-rider-contact-reader.contract';

export async function createMemoryContactReader(state: ContactFixtureState) {
  const { unitOfWork } = createInMemoryContainer();
  await seedTripAndDevices(unitOfWork, state);
  return new InMemoryMatchedRiderContactReader({
    unitOfWork,
    clock: new FixedClock(state.isPastPurgeTime ? DEADLINE : NOW),
    contacts: new Map([
      [
        BOOKING_ID,
        {
          ...SCOPE,
          standId: STAND,
          purgeAfter: state.isPastPurgeTime ? NOW : DEADLINE,
          contact: RIDER_CONTACT,
        },
      ],
    ]),
    activeCoordinators: [
      { ...SCOPE, standId: STAND, subject: TOWN_COORDINATOR_SUBJECT },
      { townId: MALVAN, standId: STAND, subject: OTHER_TOWN_COORDINATOR_SUBJECT },
    ],
  });
}

async function seedTripAndDevices(unitOfWork: UnitOfWork, state: ContactFixtureState) {
  const trip = state.hasTripEnded
    ? ({
        ...TRIP,
        status: 'cancelled_by_driver',
        reason: 'cancelled_by_driver',
        endedAt: NOW,
      } as const)
    : TRIP;
  const device: ActiveDriverDevice = {
    driverId: DRIVER_ONE,
    subject: SUBJECT_ONE,
    status: 'active',
    boundAt: NOW,
  };
  unwrap(
    await unitOfWork.run(async ({ devices, trips }) => {
      unwrap(
        await devices.save(
          state.isDeviceRevoked ? unwrap(revokeDevice(device, NOW)) : device,
          null,
        ),
      );
      unwrap(await devices.save({ ...device, driverId: DRIVER_TWO, subject: SUBJECT_TWO }, null));
      return trips.save(trip, null);
    }),
  );
}
