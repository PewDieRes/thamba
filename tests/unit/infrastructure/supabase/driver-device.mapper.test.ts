import { expect, test } from 'vitest';
import { domainValues } from '@infrastructure/composition/domain-values';
import {
  fromDriverDeviceRow,
  toDriverDeviceRow,
} from '@infrastructure/supabase/driver-device.mapper';
import { DRIVER_ONE, SUBJECT_ONE, NOW } from '../../application/demo-data.fixtures';

test('round trips the driver device row with its storage version', () => {
  const record = {
    driverId: DRIVER_ONE,
    subject: SUBJECT_ONE,
    boundAt: NOW,
    status: 'revoked' as const,
    revokedAt: NOW,
  };
  const row = { ...toDriverDeviceRow(record), version: 4 };
  const restored = fromDriverDeviceRow(row, domainValues);
  expect(restored).toEqual({ value: record, version: 4 });
  expect(row.session_user_id).toBe(SUBJECT_ONE);
});
