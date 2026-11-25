import type { UnitOfWork } from '@application/ports/unit-of-work';
import type { ContainerPorts } from './use-case-wiring';

export function getPersistenceDefaults(
  unitOfWork: UnitOfWork,
): Pick<
  ContainerPorts,
  'actorContext' | 'demoRuns' | 'dueBookings' | 'riderBookings' | 'matchedRiderContacts'
> {
  return {
    actorContext: {
      getActor: () => Promise.resolve(undefined),
    },
    demoRuns: {
      provision: () => Promise.resolve({ ok: false, error: { code: 'storage_unavailable' } }),
    },
    dueBookings: { listDue: () => Promise.resolve({ ok: true, value: [] }) },
    matchedRiderContacts: { get: () => Promise.resolve({ ok: true, value: null }) },
    riderBookings: {
      get: (bookingId) =>
        unitOfWork.run(async ({ bookings }) => ({
          ok: true,
          value: (await bookings.get(bookingId))?.value.state,
        })),
    },
  };
}
