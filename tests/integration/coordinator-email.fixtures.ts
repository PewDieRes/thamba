import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  buildCompleteCoordinatorSignIn,
  buildCoordinatorSignIn,
  createCoordinatorDirectory,
} from '@infrastructure/composition/container';
import type { AuthSession } from '@application/ports/auth-session';
import { SCOPE, STAND, TOWN } from '../unit/application/demo-data.fixtures';
import { inviteInput, unwrap } from '../unit/application/demo.fixtures';
import { getLocalConfiguration, runLocalSql } from './contract-database.fixtures';

const MAILPIT = 'http://127.0.0.1:54324';
const CALLBACK = 'http://127.0.0.1:3000/auth/callback?locale=en';

const messages = z.object({
  messages: z.array(
    z.object({
      ID: z.string(),
      To: z.array(z.object({ Address: z.string() })),
    }),
  ),
});
const emailBody = z.object({ HTML: z.string() });

export async function signInCoordinator(session: AuthSession) {
  const email = await provisionCoordinator();
  const directory = createCoordinatorDirectory();
  expect(await directory.isActiveCoordinator(email)).toEqual({ ok: true, value: true });
  expect(await directory.isActiveCoordinator('missing@example.com')).toEqual({
    ok: true,
    value: false,
  });
  const { requestLink } = buildCoordinatorSignIn({ session, directory });
  unwrap(await requestLink.execute({ email, callback: CALLBACK }));
  const code = await captureAuthCode(email);
  const complete = buildCompleteCoordinatorSignIn(session);
  unwrap(await complete.execute({ code }));
  return session;
}

async function provisionCoordinator() {
  const { url, serviceRoleKey } = getLocalConfiguration();
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const email = `${randomUUID()}@example.com`;
  const { data } = await admin.auth.admin.createUser({ email, email_confirm: true });
  const id = data.user?.id;
  if (!id) throw new Error('Could not create test Coordinator');
  runLocalSql(`
    insert into public.coordinators (id, coordinator_user_id, town_id, run_scope_id, stand_id, status)
    values ('${inviteInput.coordinatorId}', '${id}', '${TOWN}', '${SCOPE.demoRunId}', '${STAND}', 'active');
  `);
  return email;
}

async function captureAuthCode(email: string) {
  const response = await fetch(`${MAILPIT}/api/v1/messages`);
  const { messages: received } = messages.parse(await response.json());
  const match = received.find((item) => item.To.some(({ Address }) => Address === email));
  if (!match) throw new Error('Supabase did not send the test Coordinator email');
  const message = await fetch(`${MAILPIT}/api/v1/message/${match.ID}`);
  const { HTML } = emailBody.parse(await message.json());
  const href = HTML.match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)?.[1];
  if (!href) throw new Error('Supabase did not include a verification link');
  const verification = await fetch(href.replaceAll('&amp;', '&'), { redirect: 'manual' });
  const redirect = new URL(verification.headers.get('location') ?? CALLBACK);
  const code = redirect.searchParams.get('code');
  if (!code) throw new Error('Supabase did not return a PKCE code');
  return code;
}
