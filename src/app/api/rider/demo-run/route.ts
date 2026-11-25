import {
  createAuthSession,
  createConfiguredContainer,
  createRequestRateLimit,
  getRequestIp,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { respondError } from '@interface/routes/application-response';
import { createCommandRoute } from '@interface/routes/command-route';
import { guardRateLimit } from '@interface/routes/route-guards';
import { z } from 'zod';

const schema = z.strictObject({ townId: z.guid(), standId: z.guid() });

export async function POST(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const app = createConfiguredContainer(undefined, { actorContext: session });
  return createCommandRoute({
    schema,
    status: 201,
    guard: async () => {
      const blocked = await guardRateLimit(
        createRequestRateLimit(),
        'rider_session',
        getRequestIp(request.headers),
      );
      if (blocked) return blocked;
      const auth = await session.ensureAnonymous();
      return auth.ok ? undefined : respondError(auth.error.code);
    },
    execute: (input) => app.startDemoRun.execute(input),
  })(request);
}
