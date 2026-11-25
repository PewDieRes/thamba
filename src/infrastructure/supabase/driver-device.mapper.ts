import type { DriverDevice } from '@domain/identity/driver-device';
import type { Tables } from './database.types';
import type { DomainValues } from './domain-values';
import { readInstant, versioned, writeInstant } from './row.mapper';

export type DriverDeviceRow = Pick<
  Tables<'driver_devices'>,
  'session_user_id' | 'driver_id' | 'bound_at' | 'revoked_at' | 'status' | 'version'
>;

export function fromDriverDeviceRow(row: DriverDeviceRow, domain: DomainValues) {
  const binding = {
    driverId: row.driver_id as DriverDevice['driverId'],
    subject: row.session_user_id as DriverDevice['subject'],
    boundAt: readInstant(row.bound_at, domain),
  };
  return versioned<DriverDevice>(
    row,
    row.revoked_at === null
      ? { ...binding, status: 'active' }
      : { ...binding, status: 'revoked', revokedAt: readInstant(row.revoked_at, domain) },
  );
}

export function toDriverDeviceRow(value: DriverDevice): Omit<DriverDeviceRow, 'version'> {
  return {
    driver_id: value.driverId,
    session_user_id: value.subject,
    bound_at: new Date(value.boundAt.epochMilliseconds).toISOString(),
    status: value.status,
    revoked_at: writeInstant(value.status === 'revoked' ? value.revokedAt : undefined),
  };
}
