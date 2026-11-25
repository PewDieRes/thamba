import {
  createAuthSession,
  createConfiguredContainer,
  sweepActorContext,
  createRiderBookingReader,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { createCommandRoute } from '@interface/routes/command-route';
import { guardArea } from '@interface/routes/route-guards';
import { z } from 'zod';

const schema = z.strictObject({ bookingId: z.uuid() });

export async function POST(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const riderBookings = createRiderBookingReader(session);
  const app = createConfiguredContainer(undefined, {
    actorContext: session,
    riderBookings,
    riderDispatchAdvancer: {
      execute: (input) =>
        createConfiguredContainer(undefined, {
          actorContext: sweepActorContext,
        }).advanceDispatch.execute(input),
    },
  });
  return createCommandRoute({
    schema,
    guard: () => guardArea(session, 'rider'),
    execute: (input) => app.getBookingStatusForRider.execute(input),
  })(request);
}
