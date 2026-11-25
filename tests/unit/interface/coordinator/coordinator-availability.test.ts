import { expect, test, vi } from 'vitest';
import { createCoordinatorAvailabilityRoute } from '@interface/routes/coordinator-availability';
import { DRIVER_ONE, STAND } from '../../application/demo-data.fixtures';

const origin = 'http://localhost:3000';

test('rejoin returns a JSON acknowledgement without serializing the queue timestamp', async () => {
  const execute = vi.fn().mockResolvedValue({ ok: true, value: { queuedAt: 1n } });
  const post = createCoordinatorAvailabilityRoute({
    execute,
    guard: () => Promise.resolve(undefined),
  });
  const driver = { driverId: DRIVER_ONE, isOnline: true, commandKey: 'rejoin' };
  const request = new Request(`${origin}/api/coordinator/availability`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ standId: STAND, ...driver }),
  });
  const result = await post(request);
  expect(result.status).toBe(200);
  await expect(result.json()).resolves.toBeNull();
  expect(execute).toHaveBeenCalledExactlyOnceWith({ ...driver, actor: { standId: STAND } });
});
