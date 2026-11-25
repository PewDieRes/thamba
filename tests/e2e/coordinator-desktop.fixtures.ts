import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Sql } from 'postgres';

const MAILPIT_PORT = '54324';

const inbox = z.object({
  messages: z.array(
    z.object({
      ID: z.string(),
      To: z.array(z.object({ Address: z.string() })),
    }),
  ),
});
const message = z.object({ HTML: z.string() });

export async function provisionCoordinator(db: Sql, run: { demoRunId: string; standId: string }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing local Supabase coordinator fixture configuration');
  const admin = createClient(url, key, { auth: { persistSession: false } }).auth.admin;
  const email = `thamba-${randomUUID()}@example.com`;
  const { data } = await admin.createUser({ email, email_confirm: true });
  const account = data.user;
  if (!account) throw new Error('Could not create the Coordinator account');
  await db.begin(async (sql) => {
    await sql`update public.drivers set scripted_steps = null
        where run_scope_id = ${run.demoRunId} and stand_id = ${run.standId}`;
    await sql`insert into public.coordinators (town_id, run_scope_id, stand_id, coordinator_user_id, status)
        select town_id, run_scope_id, id, ${account.id}, 'active'
        from public.stands where id = ${run.standId} and demo_run_id = ${run.demoRunId}`;
  });
  return {
    email,
    cleanup: async () => {
      await db`delete from public.coordinators where coordinator_user_id = ${account.id}`;
      await admin.deleteUser(account.id);
    },
  };
}

export async function readMagicLink(apiUrl: string, email: string) {
  const mailpit = new URL(apiUrl);
  mailpit.port = MAILPIT_PORT;
  let messageId: string | undefined;
  await expect
    .poll(async () => {
      const response = await fetch(new URL('/api/v1/messages', mailpit));
      const { messages } = inbox.parse(await response.json());
      messageId = messages.find(({ To }) => To.some(({ Address }) => Address === email))?.ID;
      return Boolean(messageId);
    })
    .toBe(true);
  if (!messageId) throw new Error('Mailpit did not receive the Coordinator magic link');
  const response = await fetch(
    new URL(`/api/v1/message/${encodeURIComponent(messageId)}`, mailpit),
  );
  const { HTML } = message.parse(await response.json());
  const link = HTML.match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)?.[1];
  if (!link) throw new Error('Coordinator magic link is missing from the email');
  return link.replaceAll('&amp;', '&');
}
