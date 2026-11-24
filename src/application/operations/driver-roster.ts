import type { DriverId, StandId } from '@domain/shared/ids.value-object';
import { err, ok } from '@domain/shared/result';
import type { Transaction } from '../ports/unit-of-work';
import { sameScope } from './booking-authority';

export async function getStandDriver(tx: Transaction, driverId: DriverId, standId: StandId) {
  const queue = await tx.drivers.get(driverId);
  const stand = (await tx.stands.get(standId))?.value;
  if (!stand || !queue || queue.value.entry.standId !== standId || !sameScope(stand, queue.value)) {
    return err({ code: 'not_found' as const });
  }
  return ok({ stand, queue });
}

export async function hasDriverSlot(tx: Transaction, driverId: DriverId): Promise<boolean> {
  return Boolean(
    (await tx.offers.findPendingByDriver(driverId)) ??
    (await tx.trips.findActiveByDriver(driverId)),
  );
}
