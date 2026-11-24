import type { DomainError } from '../shared/domain.error';
import type { DriverId, SessionSubject } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import { err, ok } from '../shared/result';
import type { Result } from '../shared/result';

interface DeviceBinding {
  readonly driverId: DriverId;
  readonly subject: SessionSubject;
  readonly boundAt: Instant;
}

export type ActiveDriverDevice = DeviceBinding & { readonly status: 'active' };

type RevokedDriverDevice = DeviceBinding & {
  readonly status: 'revoked';
  readonly revokedAt: Instant;
};

export type DriverDevice = ActiveDriverDevice | RevokedDriverDevice;

export interface DriverSession {
  readonly subject: SessionSubject;
  readonly device: DriverDevice;
}

type DeviceRevocationError = DomainError<'DEVICE_REVOKED'>;
export type DriverSessionError = DomainError<'session_subject_mismatch' | 'DEVICE_REVOKED'>;

export function getBoundDriverId(session: DriverSession): Result<DriverId, DriverSessionError> {
  const { device, subject } = session;
  if (device.subject !== subject) return err({ code: 'session_subject_mismatch' });
  if (device.status === 'revoked') return err({ code: 'DEVICE_REVOKED' });
  return ok(device.driverId);
}

export function revokeDevice(
  device: DriverDevice,
  now: Instant,
): Result<RevokedDriverDevice, DeviceRevocationError> {
  if (device.status === 'revoked') return err({ code: 'DEVICE_REVOKED' });
  const { driverId, subject, boundAt } = device;
  return ok(Object.freeze({ driverId, subject, boundAt, status: 'revoked', revokedAt: now }));
}
