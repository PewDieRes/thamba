import { PostgresMatchedRiderContactReader } from '@infrastructure/supabase/postgres-matched-rider-contact-reader';
import { getPostgresConnection } from '@infrastructure/composition/postgres.configuration';
import {
  OTHER_TOWN_COORDINATOR_SUBJECT,
  RIDER_CONTACT,
  TOWN_COORDINATOR_SUBJECT,
  type ContactFixtureState,
} from '../contract/matched-rider-contact-reader.contract';
import { BOOKING_ID, TRIP } from '../contract/contract-data.fixtures';
import {
  DEMO_RUN,
  DRIVER_ONE,
  DRIVER_TWO,
  NOW,
  STAND,
  SUBJECT_ONE,
  SUBJECT_TWO,
  TOWN,
  uuid,
} from '../unit/application/demo-data.fixtures';
import { unwrap } from '../unit/domain/dispatch/booking.fixtures';
import { prepareContractDatabase, runLocalSql } from './contract-database.fixtures';
import { tripContractRepository } from './dispatch-contract.fixtures';

const OTHER_TOWN_ID = uuid(107);
const OTHER_STAND_ID = uuid(108);

export async function createPostgresContactReader(state: ContactFixtureState) {
  const persistence = await prepareContractDatabase('trips');
  const trip = state.hasTripEnded
    ? ({
        ...TRIP,
        status: 'cancelled_by_driver',
        reason: 'cancelled_by_driver',
        endedAt: NOW,
      } as const)
    : TRIP;
  unwrap(await tripContractRepository(persistence).save(trip, null));
  seedContact(state);
  const url = process.env.DATABASE_READER_URL;
  if (!url) throw new Error('Scoped reader connection was not configured');
  return new PostgresMatchedRiderContactReader(() => getPostgresConnection(url));
}

function seedContact({ isDeviceRevoked, isPastPurgeTime }: ContactFixtureState) {
  cleanContactCoordinators();
  runLocalSql(`
    begin;
    insert into auth.users (id, is_anonymous) values
      ('${TOWN_COORDINATOR_SUBJECT}', false), ('${OTHER_TOWN_COORDINATOR_SUBJECT}', false);
    insert into public.towns (id, slug, name, grievance_contact, booking_mode)
      values ('${OTHER_TOWN_ID}', 'contact-contract-other-town', 'Other Town', 'Synthetic', 'live');
    insert into public.stands (id, town_id, name, coordinator_contact)
      values ('${OTHER_STAND_ID}', '${OTHER_TOWN_ID}', 'Other Stand', 'Synthetic');
    insert into public.coordinators (town_id, run_scope_id, stand_id, coordinator_user_id, status)
      select town_id, run_scope_id, id,
        case when town_id = '${TOWN}' then '${TOWN_COORDINATOR_SUBJECT}'::uuid
             else '${OTHER_TOWN_COORDINATOR_SUBJECT}'::uuid end, 'active'
      from public.stands where id in ('${STAND}', '${OTHER_STAND_ID}');
    insert into public.driver_devices
      (town_id, run_scope_id, stand_id, driver_id, session_user_id, status, bound_at, revoked_at)
    values
      ('${TOWN}', '${DEMO_RUN}', '${STAND}', '${DRIVER_ONE}', '${SUBJECT_ONE}',
        ${isDeviceRevoked ? "'revoked', now(), now()" : "'active', now(), null"}),
      ('${TOWN}', '${DEMO_RUN}', '${STAND}', '${DRIVER_TWO}', '${SUBJECT_TWO}', 'active', now(), null);
    insert into public.rider_contacts (town_id, run_scope_id, stand_id, booking_id, first_name, phone_e164, purge_after)
      values ('${TOWN}', '${DEMO_RUN}', '${STAND}', '${BOOKING_ID}', '${RIDER_CONTACT.firstName}',
        '${RIDER_CONTACT.phone}', now() ${isPastPurgeTime ? '-' : '+'} interval '1 hour');
    commit;
  `);
}

export function cleanContactCoordinators() {
  runLocalSql(`
    begin;
    delete from public.coordinators where coordinator_user_id in
      ('${TOWN_COORDINATOR_SUBJECT}', '${OTHER_TOWN_COORDINATOR_SUBJECT}');
    delete from public.stands where id = '${OTHER_STAND_ID}';
    delete from public.towns where id = '${OTHER_TOWN_ID}';
    delete from auth.users where id in ('${TOWN_COORDINATOR_SUBJECT}', '${OTHER_TOWN_COORDINATOR_SUBJECT}');
    commit;
  `);
}
