import {
  buildCompleteCoordinatorSignIn,
  createAuthSession,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { createCoordinatorCallback } from '@interface/routes/coordinator-auth';

export async function GET(request: Request) {
  const session = createAuthSession(await getRequestCookies());
  const auth = buildCompleteCoordinatorSignIn(session);
  return createCoordinatorCallback(auth)(request);
}
