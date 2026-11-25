import {
  createAuthSession,
  createConfiguredContainer,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { commandKey } from '@interface/routes/command-key.input';
import { createCommandRoute } from '@interface/routes/command-route';
import { guardArea } from '@interface/routes/route-guards';
import { z } from 'zod';

const schema = z.strictObject({ commandKey });

export async function POST(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const app = createConfiguredContainer(undefined, { actorContext: session });
  return createCommandRoute({
    schema,
    guard: () => guardArea(session, 'driver'),
    execute: async (input) => {
      const result = await app.rejoinQueue.execute(input);
      return result.ok ? { ok: true, value: null } : result;
    },
  })(request);
}
