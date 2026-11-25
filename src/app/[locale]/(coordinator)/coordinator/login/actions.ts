'use server';

import { headers } from 'next/headers';
import {
  buildCoordinatorSignIn,
  createCoordinatorDirectory,
  createAuthSession,
  createRequestRateLimit,
  getRequestIp,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { getAppOrigin } from '@interface/auth/request-origin';
import { requestCoordinatorLink, type LoginStatus } from '@interface/actions/coordinator-login';

export async function signInCoordinator(
  _previous: LoginStatus,
  form: FormData,
): Promise<LoginStatus> {
  const requestHeaders = await headers();
  const origin = getAppOrigin('http://localhost:3000');
  if (requestHeaders.get('origin') !== origin) return 'invalid';
  const session = createAuthSession(await getRequestCookies());
  const { requestLink } = buildCoordinatorSignIn({
    session,
    directory: createCoordinatorDirectory(),
  });
  return requestCoordinatorLink(
    {
      origin,
      requestLink,
      limiter: createRequestRateLimit(),
      ip: getRequestIp(requestHeaders),
    },
    form,
  );
}
