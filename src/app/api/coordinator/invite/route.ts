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
import { getAppOrigin } from '@interface/auth/request-origin';
import { z } from 'zod';

const schema = z.strictObject({
  standId: z.guid().toLowerCase(),
  driverId: z.guid(),
  commandKey,
  locale: z.enum(['en', 'hi', 'mr']),
});

export async function POST(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const app = createConfiguredContainer(undefined, { actorContext: session });
  return createCommandRoute({
    schema,
    status: 201,
    guard: async () =>
      (await guardArea(session, 'coordinator')) ??
      guardRateLimit(createRequestRateLimit(), 'invite_issue', getRequestIp(request.headers)),
    execute: async (input) => {
      const result = await app.issueDriverInvite.execute(input);
      return result.ok
        ? {
            ok: true,
            value: {
              ...result.value,
              url: new URL(result.value.url, getAppOrigin(request.url)).href,
            },
          }
        : result;
    },
  })(request);
}
