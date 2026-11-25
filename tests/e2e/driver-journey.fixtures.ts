import { createHash, randomUUID } from 'node:crypto';
import { expect, type APIRequestContext } from '@playwright/test';
import postgres from 'postgres';
import { z } from 'zod';

const DEMO_TOWN = '00000000-0000-0000-0000-000000000001';
const RIVER_STAND = '00000000-0000-0000-0000-000000000011';
const RIVER_SQUARE = '00000000-0000-0000-0000-000000000021';
const LANTERN_GARDEN = '00000000-0000-0000-0000-000000000022';
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

export const DEMO_RIDER_NAME = 'सई';
export const DEMO_RIDER_PHONE = '+916000000001';

const demoRun = z.object({ demoRunId: z.uuid(), standId: z.uuid() });
type DemoRun = z.infer<typeof demoRun>;

export function getLocalDriverFixtureUrl() {
  const supabase = process.env.SUPABASE_URL;
  const database = new URL(process.env.DB_URL ?? DEFAULT_LOCAL_DB_URL);
  if (
    !supabase ||
    !URL.canParse(supabase) ||
    !LOCAL_HOSTS.includes(new URL(supabase).hostname) ||
    !LOCAL_HOSTS.includes(database.hostname)
  )
    return undefined;
  return database.href;
}

export async function startRiderDemo(request: APIRequestContext, origin: string) {
  return demoRun.parse(
    await post(request, origin, {
      route: 'demo-run',
      data: { townId: DEMO_TOWN, standId: RIVER_STAND },
    }),
  );
}

export async function bookRiderTrip(request: APIRequestContext, origin: string, run: DemoRun) {
  const { quoteId } = z.object({ quoteId: z.uuid() }).parse(
    await post(request, origin, {
      route: 'quote',
      data: {
        townId: DEMO_TOWN,
        demoRunId: run.demoRunId,
        pickupLandmarkId: RIVER_SQUARE,
        destinationLandmarkId: LANTERN_GARDEN,
        passengers: 1,
        commandKey: randomUUID(),
      },
    }),
  );
  return z.object({ bookingId: z.uuid() }).parse(
    await post(request, origin, {
      route: 'bookings',
      data: { quoteId, standId: run.standId, commandKey: randomUUID() },
    }),
  );
}

export async function provisionDriverInvite(db: postgres.Sql, run: DemoRun) {
  const token = randomUUID();
  const hash = createHash('sha256').update(token).digest('hex');
  await db.begin(async (sql) => {
    const [driver] = await sql<{ id: string }[]>`
      update public.drivers set scripted_steps = null
      where run_scope_id = ${run.demoRunId} and stand_id = ${run.standId} and is_synthetic
      returning id
    `;
    if (!driver) throw new Error('The isolated run needs one Driver fixture');
    await sql`delete from public.driver_queue_entries where driver_id = ${driver.id}`;
    await sql`
      insert into public.driver_invites (town_id, run_scope_id, stand_id, driver_id, token_hash, status, expires_at)
      values (${DEMO_TOWN}, ${run.demoRunId}, ${run.standId}, ${driver.id}, ${hash}, 'issued', now() + interval '15 minutes')
    `;
  });
  return token;
}

export async function seedRiderContact(db: postgres.Sql, run: DemoRun, bookingId: string) {
  await db`
    insert into public.rider_contacts (town_id, run_scope_id, stand_id, booking_id, first_name, phone_e164, purge_after)
    values (${DEMO_TOWN}, ${run.demoRunId}, ${run.standId}, ${bookingId},
      ${DEMO_RIDER_NAME}, ${DEMO_RIDER_PHONE}, now() + interval '15 minutes')
  `;
}

async function post(
  request: APIRequestContext,
  origin: string,
  { route, data }: { route: string; data: object },
) {
  const response = await request.post(`${origin}/api/rider/${route}`, {
    headers: { Origin: origin },
    data,
  });
  await expect(response).toBeOK();
  return (await response.json()) as unknown;
}
