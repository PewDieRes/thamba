import { expect, test } from 'vitest';
import {
  createDemo,
  driverCommand,
  DRIVER_ONE,
  inviteInput,
} from '../../../../tests/unit/application/demo.fixtures';

test('RevokeDriverDevice applies its Demo Town rules', async () => {
  const app = await createDemo();
  const result = await app.revokeDriverDevice.execute({ ...inviteInput, driverId: DRIVER_ONE });
  expect(result).toMatchObject({ ok: true, value: { status: 'revoked' } });
  expect(
    await app.getPendingOfferForDriver.execute({ subject: driverCommand.subject }),
  ).toMatchObject({ ok: false, error: { code: 'DEVICE_REVOKED' } });
});
