import {
  createAuthSession,
  createConfiguredContainer,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { commandKey } from '@interface/routes/command-key.input';
import { createCommandRoute } from '@interface/routes/command-route';
import { guardArea } from '@interface/routes/route-guards';
import { z } from 'zod';

const schema = z.strictObject({ standId: z.guid().toLowerCase(), driverId: z.guid(), commandKey });

export async function POST(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const app = createConfiguredContainer(undefined, { actorContext: session });
  return createCommandRoute({
    schema,
    guard: () => guardArea(session, 'coordinator'),
    execute: (input) => app.revokeDriverDevice.execute(input),
  })(request);
}
