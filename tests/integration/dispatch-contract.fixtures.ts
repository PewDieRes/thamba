import type { ApplicationResult, WriteResult } from '@application/ports/application-result';
import type { RideOfferRepository } from '@application/ports/ride-offer-repository';
import type { TripRepository } from '@application/ports/trip-repository';
import type { Transaction, UnitOfWork } from '@application/ports/unit-of-work';
import { Booking } from '@domain/dispatch/booking';
import { CONFLICT } from '../contract/versioned-repository.fixtures';

interface Persistence {
  readonly transaction: Transaction;
  readonly unitOfWork: UnitOfWork;
}

// Postgres enforces the companion projections at commit. These fixtures supply them in the same
// transaction as the adapter call, as the application does in dispatch.
export function offerContractRepository({
  transaction,
  unitOfWork,
}: Persistence): RideOfferRepository {
  const { offers } = transaction;
  return {
    get: (id) => offers.get(id),
    listByBooking: (id) => offers.listByBooking(id),
    findPendingByDriver: (id) => offers.findPendingByDriver(id),
    save: async (value, version) =>
      toWriteResult(
        await unitOfWork.run(async (tx) => {
          const saved = await tx.offers.save(value, version);
          if (!saved.ok) return saved;
          return saveOfferCompanions(tx, value);
        }),
      ),
  };
}

async function saveOfferCompanions(
  tx: Transaction,
  { offer, status }: Parameters<RideOfferRepository['save']>[0],
) {
  const current = await tx.bookings.get(offer.bookingId);
  const queue = await tx.drivers.get(offer.driverId);
  if (!current || !queue) return CONFLICT;
  const isPending = status === 'pending';
  const booking = Booking.restore({
    ...current.value.state,
    status: isPending ? 'offering' : 'requested',
    offer: isPending ? offer : undefined,
  });
  const result = await tx.bookings.save(booking, current.version);
  if (!result.ok) return result;
  const { driverId, standId } = queue.value.entry;
  return tx.drivers.save(
    {
      ...queue.value,
      entry: {
        driverId,
        standId,
        availability: 'online',
        queuedAt: 1n,
        ...(isPending ? { reservation: offer.offerId } : {}),
      },
    },
    queue.version,
  );
}

export function tripContractRepository({ transaction, unitOfWork }: Persistence): TripRepository {
  const { trips } = transaction;
  return {
    get: (id) => trips.get(id),
    findActiveByDriver: (id) => trips.findActiveByDriver(id),
    save: async (trip, version) =>
      toWriteResult(
        await unitOfWork.run(async (tx) => {
          const saved = await tx.trips.save(trip, version);
          if (!saved.ok) return saved;
          const current = await tx.bookings.get(trip.bookingId);
          if (!current) return CONFLICT;
          const booking = Booking.restore({
            ...current.value.state,
            status: trip.status,
            trip: 'endedAt' in trip ? undefined : trip,
          });
          return tx.bookings.save(booking, current.version);
        }),
      ),
  };
}

function toWriteResult(result: ApplicationResult<void>): WriteResult {
  if (result.ok) return result;
  const { code } = result.error;
  if (code === 'ConcurrencyConflict' || code === 'storage_unavailable') {
    return { ok: false, error: { code } };
  }
  throw new Error(`Unexpected contract write failure: ${code}`);
}
