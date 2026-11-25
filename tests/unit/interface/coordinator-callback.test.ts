import { expect, test, vi } from 'vitest';
import { createCoordinatorCallback } from '@interface/routes/coordinator-auth';

test('accepts the verified callback and ignores caller-supplied redirect URLs', async () => {
  const execute = vi.fn(() => Promise.resolve({ ok: true as const, value: undefined }));
  const get = createCoordinatorCallback({ execute });
  const response = await get(
    new Request(
      'https://example.test/auth/callback?locale=hi&code=123&next=https://untrusted.test',
    ),
  );
  expect(execute).toHaveBeenCalledExactlyOnceWith({ code: '123' });
  expect(response.headers.get('location')).toBe('https://example.test/hi/coordinator');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});

test('rejects an invalid callback locale before exchanging a code', async () => {
  const execute = vi.fn();
  const get = createCoordinatorCallback({ execute });
  const response = await get(
    new Request('https://example.test/auth/callback?locale=invalid&code=123'),
  );
  expect(execute).not.toHaveBeenCalled();
  expect(response.headers.get('location')).toBe('https://example.test/mr/coordinator/login');
});
