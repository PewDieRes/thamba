import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { ActorContext } from '@application/ports/actor-context';

export function verifySweepAuthorization(header: string | null, secret: string | undefined) {
  const expected = createHash('sha256')
    .update(`Bearer ${secret ?? ''}`)
    .digest();
  const given = createHash('sha256')
    .update(header ?? '')
    .digest();
  return timingSafeEqual(given, expected) && Boolean(secret);
}

export const sweepActorContext: ActorContext = {
  getActor: () => Promise.resolve({ kind: 'sweep' }),
};

export function logSweepCounts(counts: { attempted: number; advanced: number; failed: number }) {
  process.stdout.write(JSON.stringify(counts) + '\n');
}

export function getRequestIp(headers: Headers): string {
  if (process.env.VERCEL !== '1') return 'local';
  const ip = headers.get('x-vercel-forwarded-for') ?? '';
  return isIP(ip) ? ip : 'unknown';
}
