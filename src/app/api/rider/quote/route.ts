import {
  createAuthSession,
  createConfiguredContainer,
  createRequestRateLimit,
  getRequestIp,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { respondError } from '@interface/routes/application-response';
import { commandKey } from '@interface/routes/command-key.input';
import { createCommandRoute } from '@interface/routes/command-route';
import { guardRateLimit } from '@interface/routes/route-guards';
import { z } from 'zod';

const schema = z.strictObject({
  townId: z.guid(),
  demoRunId: z.uuid().optional(),
  pickupLandmarkId: z.guid(),
  destinationLandmarkId: z.guid(),
  passengers: z.int(),
  pickupAtEpochMilliseconds: z.int().optional(),
  commandKey,
});

export async function POST(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const app = createConfiguredContainer(undefined, { actorContext: session });
  return createCommandRoute({
    schema,
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
    execute: (input) => app.quoteFare.execute(input),
  })(request);
}
