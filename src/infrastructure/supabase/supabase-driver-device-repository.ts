import type { DriverDeviceRepository } from '@application/ports/driver-device-repository';
import type { ExpectedVersion } from '@application/ports/versioned';
import type { DriverId, SessionSubject } from '@domain/shared/ids.value-object';
import type { DriverDevice } from '@domain/identity/driver-device';
import type { DomainValues } from './domain-values';
import { fromDriverDeviceRow, toDriverDeviceRow } from './driver-device.mapper';
import { getRow, type RepositoryStorage } from './repository-storage';

export class SupabaseDriverDeviceRepository implements DriverDeviceRepository {
  constructor(
    private readonly storage: RepositoryStorage,
    private readonly domain: DomainValues,
  ) {}

  async get(id: SessionSubject) {
    const row = await getRow(this.storage, 'devices', { session_user_id: id });
    return row && fromDriverDeviceRow(row, this.domain);
  }

  async findActiveByDriver(driverId: DriverId) {
    const row = await getRow(this.storage, 'devices', { driver_id: driverId, status: 'active' });
    return row && fromDriverDeviceRow(row, this.domain);
  }

  save(value: DriverDevice, expectedVersion: ExpectedVersion) {
    return this.storage.save({
      resource: 'devices',
      key: { session_user_id: value.subject },
      row: toDriverDeviceRow(value),
      expectedVersion,
    });
  }
}
