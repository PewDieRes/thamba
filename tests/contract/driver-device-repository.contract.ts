import type { DriverDeviceRepository } from '@application/ports/driver-device-repository';
import { expect, test } from 'vitest';
import type { ActiveDriverDevice } from '@domain/identity/driver-device';
import { DRIVER_ONE, NOW, SUBJECT_ONE, SUBJECT_TWO } from '../unit/application/demo-data.fixtures';
import {
  CONFLICT,
  SAVED,
  type AdapterFactory,
  versionedRepositoryContract,
} from './versioned-repository.fixtures';

const active: ActiveDriverDevice = {
  driverId: DRIVER_ONE,
  subject: SUBJECT_ONE,
  status: 'active',
  boundAt: NOW,
};

export function driverDeviceRepositoryContract(make: AdapterFactory<DriverDeviceRepository>) {
  versionedRepositoryContract({
    name: 'DriverDeviceRepository',
    make,
    id: SUBJECT_ONE,
    first: active,
    updated: { ...active, status: 'revoked', revokedAt: NOW },
  });
  test('DriverDeviceRepository permits one active binding for a Driver', async () => {
    const repo = await make();
    const second = { ...active, subject: SUBJECT_TWO };
    expect(await repo.save(active, null)).toEqual(SAVED);
    expect(await repo.save(second, null)).toEqual(CONFLICT);
    expect(await repo.findActiveByDriver(DRIVER_ONE)).toEqual({ value: active, version: 1 });
    expect(await repo.save({ ...active, status: 'revoked', revokedAt: NOW }, 1)).toEqual(SAVED);
    expect(await repo.findActiveByDriver(DRIVER_ONE)).toBeUndefined();
    expect(await repo.save(second, null)).toEqual(SAVED);
  });
}
