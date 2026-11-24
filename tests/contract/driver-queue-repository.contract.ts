import type { DriverQueueRepository } from '@application/ports/driver-queue-repository';
import { expect, test } from 'vitest';
import type { ScopedQueueEntry } from '@application/ports/driver-queue-repository';
import { DRIVER_ONE, SCOPE, STAND, TOWN } from '../unit/application/demo-data.fixtures';
import {
  SAVED,
  type AdapterFactory,
  versionedRepositoryContract,
} from './versioned-repository.fixtures';

const offline: ScopedQueueEntry = {
  ...SCOPE,
  entry: { driverId: DRIVER_ONE, standId: STAND, availability: 'offline' },
};

export function driverQueueRepositoryContract(make: AdapterFactory<DriverQueueRepository>) {
  versionedRepositoryContract({
    name: 'DriverQueueRepository',
    make,
    id: DRIVER_ONE,
    first: offline,
    updated: { ...offline, entry: { ...offline.entry, availability: 'online', queuedAt: 1n } },
  });
  test('DriverQueueRepository filters by Stand and demo run', async () => {
    const repo = await make();
    expect(await repo.save(offline, null)).toEqual(SAVED);
    expect(await repo.listForStands(SCOPE, [STAND])).toEqual([{ version: 1, value: offline }]);
    expect(await repo.listForStands({ townId: TOWN }, [STAND])).toEqual([]);
    expect(await repo.listForStands(SCOPE, [])).toEqual([]);
  });
}
