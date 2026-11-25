import { z } from 'zod';
import type { ApplicationResult } from '@application/ports/application-result';
import type { RequestRateLimit } from '@application/ports/request-rate-limit';

export type LoginStatus = 'idle' | 'invalid' | 'sent' | 'try_later';

const login = z.strictObject({ email: z.email().max(254), locale: z.enum(['en', 'hi', 'mr']) });

export async function requestCoordinatorLink(
  {
    requestLink,
    limiter,
    ip,
    origin,
  }: {
    requestLink: { execute(input: unknown): Promise<ApplicationResult<void>> };
    limiter: RequestRateLimit;
    ip: string;
    origin: string;
  },
  form: FormData,
): Promise<LoginStatus> {
  const parsed = login.safeParse({ email: form.get('email'), locale: form.get('locale') });
  if (!parsed.success) return 'invalid';
  const allowed = await limiter.allow('coordinator_login', ip);
  if (!allowed.ok || !allowed.value) return 'try_later';
  const callback = new URL('/auth/callback', origin);
  callback.searchParams.set('locale', parsed.data.locale);
  const sent = await requestLink.execute({ email: parsed.data.email, callback: callback.href });
  return sent.ok ? 'sent' : 'try_later';
}
