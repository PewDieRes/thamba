import { expect, it } from 'vitest';
import { getBoundDriverId, revokeDevice } from '@domain/identity/driver-device';
import { err, ok } from '@domain/shared/result';
import { at, driverId, driverSession, otherSubject, unwrap } from '../dispatch/booking.fixtures';

it('resolves only the session subject attached to the current device', () => {
  expect(getBoundDriverId(driverSession)).toEqual(ok(driverId));
  expect(getBoundDriverId({ ...driverSession, subject: otherSubject })).toEqual(
    err({ code: 'session_subject_mismatch' }),
  );
});

it('revokes the binding immutably and rejects repeated revocation and use', () => {
  const now = at(10);
  const device = unwrap(revokeDevice(driverSession.device, now));
  expect(device).toEqual({ ...driverSession.device, status: 'revoked', revokedAt: now });
  expect(driverSession.device.status).toBe('active');
  expect(revokeDevice(device, at(11))).toEqual(err({ code: 'DEVICE_REVOKED' }));
  expect(getBoundDriverId({ ...driverSession, device })).toEqual(err({ code: 'DEVICE_REVOKED' }));
});
