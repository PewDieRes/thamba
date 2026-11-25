import { PostgresCoordinatorDashboardReader } from '@infrastructure/supabase/postgres-coordinator-dashboard-reader';
import { PostgresDemoComplaintWriter } from '@infrastructure/supabase/postgres-demo-complaint-writer';
import { getPostgresConnection } from '@infrastructure/composition/postgres.configuration';
import {
  COORDINATOR,
  DEMO_RUN,
  DRIVER_ONE,
  DRIVER_TWO,
  RIDER,
  STAND,
  SUBJECT_ONE,
  SUBJECT_TWO,
  TOWN,
} from '../unit/application/demo-data.fixtures';
import {
  operationsEvent,
  operationsDrivers,
  OTHER_OPERATIONS_RUN,
  OTHER_OPERATIONS_STAND,
} from '../contract/coordinator-operations.contract';
import { BOOKING_ID } from '../contract/contract-data.fixtures';
import { unwrap } from '../unit/domain/dispatch/booking.fixtures';
import { prepareContractDatabase, runLocalSql } from './contract-database.fixtures';

export async function preparePostgresOperations() {
  const { transaction } = await prepareContractDatabase('events');
  runLocalSql(`
    begin;
    update auth.users set is_anonymous = true where id in ('${RIDER}', '${SUBJECT_TWO}');
    update auth.users set is_anonymous = false where id = '${SUBJECT_ONE}';
    update public.stands set name = 'Operations Stand' where id = '${STAND}';
    update public.drivers set vehicle_number = 'DEMO 01' where id = '${DRIVER_ONE}';
    delete from public.drivers where id = '${DRIVER_TWO}';
    delete from public.bookings where id <> '${BOOKING_ID}' and town_id = '${TOWN}';
    insert into public.demo_runs (id, town_id, simulation_profile_id, rider_user_id, expires_at)
      select '${OTHER_OPERATIONS_RUN}', town_id, simulation_profile_id, '${SUBJECT_TWO}', now() + interval '1 day'
      from public.demo_runs where id = '${DEMO_RUN}';
    insert into public.stands (id, town_id, demo_run_id, name, coordinator_contact)
      values ('${OTHER_OPERATIONS_STAND}', '${TOWN}', '${OTHER_OPERATIONS_RUN}', 'Other Stand', 'Synthetic');
    insert into public.drivers (id, town_id, run_scope_id, stand_id, name, is_synthetic, vehicle_number)
      values ('${DRIVER_TWO}', '${TOWN}', '${OTHER_OPERATIONS_RUN}', '${OTHER_OPERATIONS_STAND}', 'Driver Two', true, 'DEMO 02');
    insert into public.coordinators (id, coordinator_user_id, town_id, run_scope_id, stand_id, status)
      values ('${COORDINATOR}', '${SUBJECT_ONE}', '${TOWN}', '${DEMO_RUN}', '${STAND}', 'active');
    commit;
  `);
  for (const driver of operationsDrivers) unwrap(await transaction.drivers.save(driver, null));
  unwrap(await transaction.events.append(operationsEvent));
  const reader = process.env.DATABASE_READER_URL;
  const writer = process.env.DATABASE_WRITER_URL;
  if (!reader || !writer) throw new Error('Missing scoped database connections');
  return {
    dashboard: new PostgresCoordinatorDashboardReader(getPostgresConnection(reader)),
    complaints: new PostgresDemoComplaintWriter(getPostgresConnection(writer)),
  };
}
