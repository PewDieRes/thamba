import type { DriverDevice } from '@domain/identity/driver-device';
import type { DriverId, SessionSubject } from '@domain/shared/ids.value-object';
import type { WriteResult } from './application-result';
import type { ExpectedVersion, Versioned } from './versioned';

export interface DriverDeviceRepository {
  get(id: SessionSubject): Promise<Versioned<DriverDevice> | undefined>;
  findActiveByDriver(driverId: DriverId): Promise<Versioned<DriverDevice> | undefined>;
  save(value: DriverDevice, expectedVersion: ExpectedVersion): Promise<WriteResult>;
}
