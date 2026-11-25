import { execFileSync } from 'node:child_process';
import { createSupabasePersistence } from '@infrastructure/composition/container';
import type { Transaction } from '@application/ports/unit-of-work';
import {
  DEMO_RUN,
  DEMO_STAND,
  DEMO_TOWN,
  DESTINATION,
  DRIVER_ONE,
  DRIVER_TWO,
  FARE_CHART,
  PICKUP,
  RIDER,
  SCOPE,
  STAND,
  SUBJECT_ONE,
  SUBJECT_TWO,
  TOWN,
} from '../unit/application/demo-data.fixtures';
import { BOOKING, OTHER_BOOKING_ID } from '../contract/contract-data.fixtures';
import { Booking } from '@domain/dispatch/booking';

type Fixture = keyof Transaction | 'unitOfWork' | 'demoRun';

export function runLocalSql(input: string): void {
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      'supabase_db_thamba',
      'psql',
      '-U',
      'postgres',
      '-X',
      '-q',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    {
      input,
      stdio: ['pipe', 'ignore', 'pipe'],
    },
  );
}

export function cleanContractDatabase(): void {
  runLocalSql(`
    begin;
    delete from public.domain_events where town_id = '${TOWN}';
    delete from public.trips where town_id = '${TOWN}';
    delete from public.ride_offers where town_id = '${TOWN}';
    delete from public.driver_queue_entries where town_id = '${TOWN}';
    delete from public.driver_slots where town_id = '${TOWN}';
    delete from public.driver_devices where town_id = '${TOWN}';
    delete from public.driver_invites where town_id = '${TOWN}';
    delete from public.drivers where town_id = '${TOWN}';
    delete from public.bookings where town_id = '${TOWN}';
    delete from public.fare_quotes where town_id = '${TOWN}';
    delete from public.fare_routes where town_id = '${TOWN}';
    delete from public.fare_charts where town_id = '${TOWN}';
    delete from public.routes where town_id = '${TOWN}';
    delete from public.stand_neighbours where town_id = '${TOWN}';
    delete from public.coordinators where town_id = '${TOWN}';
    delete from public.stands where town_id = '${TOWN}';
    delete from public.landmarks where town_id = '${TOWN}';
    delete from public.command_log where town_id = '${TOWN}';
    delete from public.demo_runs where town_id = '${TOWN}';
    delete from public.simulation_profiles where town_id = '${TOWN}';
    delete from public.towns where id = '${TOWN}';
    delete from auth.users where id in ('${RIDER}', '${SUBJECT_ONE}', '${SUBJECT_TWO}');
    commit;
  `);
}

export function getLocalConfiguration() {
  const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey } = process.env;
  if (
    !url ||
    !serviceRoleKey ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)
  ) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the local Thamba stack');
  }
  return { backend: 'supabase', url, serviceRoleKey } as const;
}

export function createContractPersistence() {
  return createSupabasePersistence({
    ...getLocalConfiguration(),
    commandScope: { town_id: TOWN, demo_run_id: DEMO_RUN },
  });
}

export async function prepareContractDatabase(fixture: Fixture) {
  getLocalConfiguration();
  cleanContractDatabase();
  runLocalSql(`
    insert into auth.users (id) values ('${RIDER}'), ('${SUBJECT_ONE}'), ('${SUBJECT_TWO}');
  `);
  const persistence = createContractPersistence();
  if (fixture !== 'towns' && fixture !== 'unitOfWork') {
    await seedContractDatabase(fixture, persistence.transaction);
  }
  return persistence;
}

async function seedContractDatabase(fixture: Fixture, tx: Transaction) {
  assertSaved(
    await tx.towns.save(
      fixture === 'demoRun' ? { ...CONTRACT_TOWN, demoRuns: [] } : CONTRACT_TOWN,
      null,
    ),
  );
  runLocalSql(`
    insert into public.landmarks (id, town_id, slug, name) values
      ('${PICKUP}', '${TOWN}', 'pickup', 'Pickup'),
      ('${DESTINATION}', '${TOWN}', 'destination', 'Destination');
  `);
  if (
    fixture === 'demoRun' ||
    fixture === 'stands' ||
    fixture === 'commands' ||
    fixture === 'fareCharts'
  )
    return;
  assertSaved(await tx.stands.save(DEMO_STAND, null));
  assertSaved(await tx.fareCharts.save(FARE_CHART, null));
  runLocalSql(`
    insert into public.drivers (id, town_id, run_scope_id, stand_id, name, is_synthetic) values
      ('${DRIVER_ONE}', '${TOWN}', '${DEMO_RUN}', '${STAND}', 'Driver One', true),
      ('${DRIVER_TWO}', '${TOWN}', '${DEMO_RUN}', '${STAND}', 'Driver Two', true);
  `);
  await seedDispatchCompanions(fixture, tx);
}

async function seedDispatchCompanions(fixture: Fixture, tx: Transaction) {
  if (fixture === 'offers' || fixture === 'trips' || fixture === 'events') {
    assertSaved(await tx.bookings.save(BOOKING, null));
    assertSaved(
      await tx.bookings.save(
        Booking.restore({ ...BOOKING.state, bookingId: OTHER_BOOKING_ID }),
        null,
      ),
    );
  }
  if (fixture === 'offers' || fixture === 'trips') {
    assertSaved(
      await tx.drivers.save(
        {
          ...SCOPE,
          entry: {
            driverId: DRIVER_ONE,
            standId: STAND,
            availability: 'offline',
          },
        },
        null,
      ),
    );
    assertSaved(
      await tx.drivers.save(
        {
          ...SCOPE,
          entry: {
            driverId: DRIVER_TWO,
            standId: STAND,
            availability: 'offline',
          },
        },
        null,
      ),
    );
  }
}

export const CONTRACT_TOWN = { ...DEMO_TOWN, slug: 'repository-contract-demo-town' };

function assertSaved(result: Awaited<ReturnType<Transaction['towns']['save']>>): void {
  if (!result.ok)
    throw new Error(`Could not seed repository contract fixture: ${result.error.code}`);
}
