'use server';

import {
  createAuthSession,
  createCoordinatorDashboard,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { z } from 'zod';

export async function readCoordinatorDashboard(standId?: string) {
  const input = z.guid().optional().safeParse(standId);
  if (!input.success) return { ok: false, error: { code: 'invalid_input' } } as const;
  const session = createAuthSession(await getRequestCookies());
  return createCoordinatorDashboard(session).execute({ standId: input.data });
}
