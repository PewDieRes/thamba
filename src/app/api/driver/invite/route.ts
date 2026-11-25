import {
  createAuthSession,
  createConfiguredContainer,
  createRequestRateLimit,
  getRequestIp,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { commandKey } from '@interface/routes/command-key.input';
import { createCommandRoute } from '@interface/routes/command-route';
import { guardArea, guardRateLimit } from '@interface/routes/route-guards';
import { z } from 'zod';

const schema = z.strictObject({ token: z.string().min(1).max(256), commandKey });

export async function POST(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const app = createConfiguredContainer(undefined, { actorContext: session });
  return createCommandRoute({
    schema,
    guard: async () =>
      (await guardArea(session, 'rider')) ??
      guardRateLimit(createRequestRateLimit(), 'invite_redeem', getRequestIp(request.headers)),
    execute: (input) => app.redeemDriverInvite.execute(input),
  })(request);
}
