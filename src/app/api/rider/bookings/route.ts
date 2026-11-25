import {
  createAuthSession,
  createConfiguredContainer,
  createRequestRateLimit,
  getRequestIp,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { createRiderBookingRoute } from '@interface/routes/rider-booking';

export async function POST(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const app = createConfiguredContainer(undefined, { actorContext: session });
  const limiter = createRequestRateLimit();
  return createRiderBookingRoute({
    allow: () => limiter.allow('booking', getRequestIp(request.headers)),
    ensureAnonymous: () => session.ensureAnonymous(),
    requestRide: app.requestRide,
    scheduleRide: app.scheduleRide,
  })(request);
}
