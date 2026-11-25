import {
  createAuthSession,
  createCoordinatorDashboard,
} from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { respondError } from '@interface/routes/application-response';
import { mapRidesCsv } from '@interface/routes/coordinator-rides.mapper';
import { z } from 'zod';

export async function GET(request: Request) {
  const stand = z.guid().safeParse(new URL(request.url).searchParams.get('standId'));
  if (!stand.success) return respondError('invalid_input');
  const session = createAuthSession(await getRequestCookies());
  const result = await createCoordinatorDashboard(session).execute({ standId: stand.data });
  if (!result.ok) return respondError(result.error.code);
  return new Response(mapRidesCsv(result.value.dashboard.rides), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rides.csv"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
