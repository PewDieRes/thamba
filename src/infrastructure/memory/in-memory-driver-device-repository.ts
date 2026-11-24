import type { DriverId } from '@domain/shared/ids.value-object';
import type { DriverDevice } from '@domain/identity/driver-device';
import type { SessionSubject } from '@domain/shared/ids.value-object';
import type { DriverDeviceRepository } from '@application/ports/driver-device-repository';
import type { WriteResult } from '@application/ports/application-result';
import type { ExpectedVersion } from '@application/ports/versioned';
import { MemoryTable } from './memory-table';

export class InMemoryDriverDeviceRepository implements DriverDeviceRepository {
  constructor(private readonly table = new MemoryTable<DriverDevice>()) {}

  get(id: SessionSubject) {
    return Promise.resolve(this.table.get(id));
  }

  findActiveByDriver(driverId: DriverId) {
    return Promise.resolve(
      this.table
        .list()
        .find(({ value }) => value.driverId === driverId && value.status === 'active'),
    );
  }

  save(value: DriverDevice, expectedVersion: ExpectedVersion): Promise<WriteResult> {
    const id = value.subject;
    if (
      value.status === 'active' &&
      this.table
        .list()
        .some(
          ({ value: existing }) =>
            existing.subject !== id &&
            existing.driverId === value.driverId &&
            existing.status === 'active',
        )
    )
      return Promise.resolve({ ok: false, error: { code: 'ConcurrencyConflict' } });

    return Promise.resolve(this.table.save(id, value, expectedVersion));
  }
}
