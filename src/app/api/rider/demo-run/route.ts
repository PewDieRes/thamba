import {
  createAuthSession,
  createConfiguredContainer,
  createRequestRateLimit,
  getRequestIp,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { createCommandRoute } from '@interface/routes/command-route';
import { guardRateLimit } from '@interface/routes/route-guards';
import { z } from 'zod';

const schema = z.strictObject({
  townId: z.guid(),
  standId: z.guid(),
  scenario: z.enum(['successful_trip', 'queue_exhaustion']).optional(),
});

export async function POST(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const app = createConfiguredContainer(undefined, { actorContext: session, demoSession: session });
  return createCommandRoute({
    schema,
    status: 201,
    guard: () =>
      guardRateLimit(createRequestRateLimit(), 'rider_session', getRequestIp(request.headers)),
    execute: (input) => app.startDemoRun.execute(input),
  })(request);
}
