import {
  buildStartAnonymousSession,
  createAuthSession,
  createRequestRateLimit,
  getRequestIp,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { createCommandRoute } from '@interface/routes/command-route';
import { guardRateLimit } from '@interface/routes/route-guards';
import { z } from 'zod';

export async function POST(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const useCase = buildStartAnonymousSession(session);
  return createCommandRoute({
    schema: z.strictObject({}),
    guard: () =>
      guardRateLimit(createRequestRateLimit(), 'driver_session', getRequestIp(request.headers)),
    execute: (input) => useCase.execute(input),
  })(request);
}
