import type { ActorContext } from '@application/ports/actor-context';
import type { RequestRateLimit, RateLimitScope } from '@application/ports/request-rate-limit';
import { canAccessArea, type ProtectedArea } from '../auth/area-guard';
import { respondError } from './application-response';

export async function guardArea(actorContext: ActorContext, area: ProtectedArea) {
  const actor = await actorContext.getActor();
  if (!actor) return respondError('unauthenticated');
  return canAccessArea(area, actor) ? undefined : respondError('forbidden');
}

export async function guardRateLimit(limiter: RequestRateLimit, scope: RateLimitScope, ip: string) {
  const allowance = await limiter.allow(scope, ip);
  if (!allowance.ok) return respondError(allowance.error.code);
  if (!allowance.value) return respondError('rate_limit_exceeded');
  return undefined;
}
