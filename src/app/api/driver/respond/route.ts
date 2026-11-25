import {
  createAuthSession,
  createConfiguredContainer,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { commandKey } from '@interface/routes/command-key.input';
import { createCommandRoute } from '@interface/routes/command-route';
import { guardArea } from '@interface/routes/route-guards';
import { z } from 'zod';

const schema = z.strictObject({
  offerId: z.uuid(),
  action: z.enum(['accept', 'decline']),
  commandKey,
});

export async function POST(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const app = createConfiguredContainer(undefined, { actorContext: session });
  return createCommandRoute({
    schema,
    guard: () => guardArea(session, 'driver'),
    execute: (input) => app.respondToRideOffer.execute(input),
  })(request);
}
