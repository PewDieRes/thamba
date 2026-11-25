import {
  createAuthSession,
  createConfiguredContainer,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { createCoordinatorAvailabilityRoute } from '@interface/routes/coordinator-availability';
import { guardArea } from '@interface/routes/route-guards';

export async function POST(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const app = createConfiguredContainer(undefined, { actorContext: session });
  return createCoordinatorAvailabilityRoute({
    guard: () => guardArea(session, 'coordinator'),
    execute: (input) => app.setDriverAvailability.execute(input),
  })(request);
}
