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
  isSynthetic: true,
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
  test('DriverQueueRepository stores the rejoin marker and clears it when the Driver joins', async () => {
    const repo = await make();
    const completed = { ...offline, needsRejoin: true } as const;
    const online = {
      ...offline,
      entry: { ...offline.entry, availability: 'online', queuedAt: 1n },
    } as const;
    expect(await repo.save(offline, null)).toEqual(SAVED);
    expect(await repo.save(completed, 1)).toEqual(SAVED);
    expect(await repo.get(DRIVER_ONE)).toEqual({ version: 2, value: completed });
    expect(await repo.save(online, 2)).toEqual(SAVED);
    expect(await repo.get(DRIVER_ONE)).toEqual({ version: 3, value: online });
  });
  test('DriverQueueRepository filters by Stand and demo run', async () => {
    const repo = await make();
    expect(await repo.save(offline, null)).toEqual(SAVED);
    expect(await repo.listForStands(SCOPE, [STAND])).toEqual([{ version: 1, value: offline }]);
    expect(await repo.listForStands({ townId: TOWN }, [STAND])).toEqual([]);
    expect(await repo.listForStands(SCOPE, [])).toEqual([]);
  });
}
