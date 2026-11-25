import {
  createAuthSession,
  createConfiguredContainer,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { createCommandRoute } from '@interface/routes/command-route';
import { guardArea } from '@interface/routes/route-guards';
import { z } from 'zod';

export async function POST(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const app = createConfiguredContainer(undefined, { actorContext: session });
  return createCommandRoute({
    schema: z.strictObject({}),
    guard: () => guardArea(session, 'driver'),
    execute: (input) => app.getPendingOfferForDriver.execute(input),
  })(request);
}
