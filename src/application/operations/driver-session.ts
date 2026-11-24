import { getBoundDriverId } from '@domain/identity/driver-device';
import type { SessionSubject } from '@domain/shared/ids.value-object';
import { err, ok } from '@domain/shared/result';
import type { DriverDeviceRepository } from '../ports/driver-device-repository';

export async function getDriverSession(devices: DriverDeviceRepository, subject: SessionSubject) {
  const record = await devices.get(subject);
  if (!record) return err({ code: 'not_found' as const });
  const driver = { subject, device: record.value };
  const bound = getBoundDriverId(driver);
  return bound.ok ? ok({ driver, driverId: bound.value }) : bound;
}
