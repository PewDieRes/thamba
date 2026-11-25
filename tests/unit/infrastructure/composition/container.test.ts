import { afterEach, expect, test, vi } from 'vitest';
import { createConfiguredContainer } from '@infrastructure/composition/container';

afterEach(() => vi.unstubAllEnvs());

test.each([
  { secret: undefined, code: 'missing_invite_token_secret' },
  { secret: Buffer.alloc(31).toString('base64'), code: 'invalid_invite_token_secret' },
  { secret: `${Buffer.alloc(32).toString('base64')}!`, code: 'invalid_invite_token_secret' },
])('fails server composition with $code', ({ secret, code }) => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-only');
  vi.stubEnv('INVITE_TOKEN_SECRET', secret);

  expect(() => createConfiguredContainer()).toThrow(expect.objectContaining({ code }));
});
