import { getProtectedArea } from '@interface/auth/protected-path';
import { verifySweepAuthorization } from '@infrastructure/composition/container';
import { SUBJECT_ONE } from '../application/demo-data.fixtures';
import { expect, test, vi } from 'vitest';
import { createDemo } from '../application/demo.fixtures';
import { createDispatchSweepRoute } from '@interface/routes/dispatch-sweep';
import { canAccessArea } from '@interface/auth/area-guard';
import { createRiderBookingRoute } from '@interface/routes/rider-booking';

test.each([undefined, 'Bearer wrong'])(
  'sweep rejects invalid authorization %s',
  async (authorization) => {
    const app = await createDemo();
    const execute = vi.spyOn(app.sweepDispatch, 'execute');
    const post = createDispatchSweepRoute({
      isAuthorized: (header) => verifySweepAuthorization(header, 'shared-secret'),
      sweepDispatch: app.sweepDispatch,
      logCounts: vi.fn(),
    });
    const headers = authorization ? { authorization } : {};
    expect(
      (await post(new Request('https://example.test', { method: 'POST', headers }))).status,
    ).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  },
);

test('a revoked Driver device fails the Driver guard', () => {
  const session = { kind: 'anonymous', subject: SUBJECT_ONE, hasDriverDevice: false } as const;
  expect(canAccessArea('driver', session)).toBe(false);
  expect(canAccessArea('rider', session)).toBe(true);
  expect(canAccessArea('coordinator', session)).toBe(false);
});

test('booking request rate limit prevents sign-in and booking creation', async () => {
  const app = await createDemo();
  const execute = vi.spyOn(app.requestRide, 'execute');
  const signIn = vi.fn();
  const post = createRiderBookingRoute({
    ensureAnonymous: signIn,
    allow: () => Promise.resolve({ ok: true, value: false }),
    requestRide: app.requestRide,
  });
  const request = new Request('https://example.test/api/rider/bookings', {
    method: 'POST',
    headers: { origin: 'https://example.test' },
    body: JSON.stringify({
      quoteId: '61c50d28-1e30-4037-8e5c-d0300fe2105c',
      standId: '61c50d28-1e30-4037-8e5c-d0300fe2105d',
      commandKey: 'booking',
    }),
  });
  expect((await post(request)).status).toBe(429);
  expect(execute).not.toHaveBeenCalled();
  expect(signIn).not.toHaveBeenCalled();
});

test('authorized sweep logs only counts', async () => {
  const app = await createDemo();
  const logCounts = vi.fn();
  const post = createDispatchSweepRoute({
    isAuthorized: (header) => verifySweepAuthorization(header, 'shared-secret'),
    sweepDispatch: app.sweepDispatch,
    logCounts,
  });
  const response = await post(
    new Request('https://example.test', {
      method: 'POST',
      headers: { authorization: 'Bearer shared-secret' },
    }),
  );
  expect(response.status).toBe(200);
  expect(logCounts).toHaveBeenCalledExactlyOnceWith({ attempted: 0, advanced: 0, failed: 0 });
});

test('the Rider can open a Town booking form before establishing an anonymous session', () => {
  expect(getProtectedArea('/mr/rider/demo-town')).toBeUndefined();
  expect(getProtectedArea('/mr/rider/status/a-booking')).toBe('rider');
});
