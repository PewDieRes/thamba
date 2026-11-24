import type { Booking } from '@domain/dispatch/booking';
import { planNextDispatchStep } from '@domain/dispatch/dispatch-planner';
import type { DriverRankingPolicy } from '@domain/dispatch/driver-ranking.policy';
import type { DriverId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import type { Transaction } from '../ports/unit-of-work';
import { servesPickup } from './booking-authority';

export async function planDispatch(
  tx: Transaction,
  booking: Booking,
  {
    now,
    canBook,
    driverRanking,
  }: { now: Instant; canBook: boolean; driverRanking: DriverRankingPolicy },
) {
  const planner = await readDispatchSnapshot(tx, booking);
  let eligibleDriverIds: readonly DriverId[] = [];
  const step = planNextDispatchStep({
    booking,
    now,
    authority: { canBook },
    ...planner,
    policies: {
      driverRanking: {
        rank: (entries) => {
          const ranked = driverRanking.rank(entries);
          eligibleDriverIds = ranked.map(({ driverId }) => driverId);
          return ranked;
        },
      },
    },
  });
  return { step, eligibleDriverIds };
}

async function readDispatchSnapshot(tx: Transaction, { state }: Booking) {
  const standIds = state.status === 'requested' ? (state.searchStandIds ?? []) : [];
  const [queue, standRecords, offerHistory] = await Promise.all([
    tx.drivers.listForStands(state, standIds),
    Promise.all(standIds.map((id) => tx.stands.get(id))),
    tx.offers.listByBooking(state.bookingId),
  ]);
  const entries = queue.map(({ value }) => value.entry);
  const slots = await Promise.all(
    entries.map(async ({ driverId }) =>
      (await tx.trips.findActiveByDriver(driverId)) ? [driverId] : [],
    ),
  );
  return {
    offerHistory: offerHistory.map(({ offer }) => offer),
    queueSnapshot: {
      entries,
      activeTripDriverIds: new Set(slots.flat()),
      stands: standRecords.flatMap((record) => {
        const stand = record?.value;
        return stand
          ? [
              {
                ...stand,
                servesPickupArea: servesPickup(stand, state, state.fare.route.pickupLandmarkId),
              },
            ]
          : [];
      }),
    },
  };
}
