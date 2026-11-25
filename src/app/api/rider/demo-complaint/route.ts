import { createAuthSession, createDemoComplaint } from '@infrastructure/composition/container';
import { getRequestCookies } from '@interface/auth/request-cookies';
import { createCommandRoute } from '@interface/routes/command-route';
import { z } from 'zod';

const schema = z.strictObject({
  townId: z.guid(),
  demoRunId: z.uuid(),
  complaintId: z.uuid(),
  topic: z.enum(['fare', 'wait', 'trip']),
});

export async function POST(request: Request) {
  const actorContext = createAuthSession(await getRequestCookies());
  return createCommandRoute({
    schema,
    status: 201,
    execute: (input) => createDemoComplaint(actorContext).execute(input),
  })(request);
}
