import { expect, test, vi } from 'vitest';
import { z } from 'zod';
import { createDemo, quoteInput, unwrap } from '../application/demo.fixtures';
import { createCommandRoute } from '@interface/routes/command-route';

test('rejects a cross-origin invite redemption before reading the token', async () => {
  const execute = vi.fn();
  const post = createCommandRoute({ schema: z.strictObject({ token: z.string() }), execute });
  const response = await post(
    new Request('https://example.test/api/driver/invite', {
      method: 'POST',
      headers: { origin: 'https://untrusted.test' },
      body: JSON.stringify({ token: 'example' }),
    }),
  );
  expect(response.status).toBe(403);
  expect(execute).not.toHaveBeenCalled();
});

test('returns a replacement fare quote for explicit confirmation', async () => {
  const app = await createDemo();
  const freshQuote = unwrap(await app.quoteFare.execute(quoteInput));
  const post = createCommandRoute({
    schema: z.strictObject({}),
    execute: () => Promise.resolve({ ok: false, error: { code: 'stale_quote', freshQuote } }),
  });
  const response = await post(
    new Request('https://example.test/api/rider/bookings', {
      method: 'POST',
      headers: { origin: 'https://example.test' },
      body: '{}',
    }),
  );
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ code: 'stale_quote', freshQuote });
});
