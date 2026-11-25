create role thamba_reader nologin noinherit nobypassrls;
create role thamba_writer nologin noinherit nobypassrls;
create role thamba_sweep nologin noinherit nobypassrls;
grant thamba_reader, thamba_writer, thamba_sweep to postgres with inherit false, set true;

grant usage on schema public to thamba_reader, thamba_writer, thamba_sweep;
grant usage on schema thamba_private to thamba_reader, thamba_writer;

create function thamba_private.town_matches(target_town_id uuid)
returns boolean language sql stable set search_path = ''
as $$
  select target_town_id::text = current_setting('thamba.town_id', true);
$$;

create function thamba_private.scope_matches(target_town_id uuid, target_run_scope_id uuid)
returns boolean language sql stable set search_path = ''
as $$
  select thamba_private.town_matches(target_town_id)
    and target_run_scope_id::text = case current_setting('thamba.demo_run_id', true)
      when 'live' then '00000000-0000-0000-0000-000000000000'
      else current_setting('thamba.demo_run_id', true)
    end;
$$;

create function thamba_private.stand_matches(
  target_town_id uuid, target_run_scope_id uuid, target_stand_id uuid
)
returns boolean language sql stable set search_path = ''
as $$
  select thamba_private.scope_matches(target_town_id, target_run_scope_id)
    and target_stand_id::text = any(string_to_array(current_setting('thamba.stand_ids', true), ','));
$$;

revoke all on function thamba_private.town_matches(uuid),
  thamba_private.scope_matches(uuid, uuid), thamba_private.stand_matches(uuid, uuid, uuid)
from public, anon, authenticated, service_role;
grant execute on function thamba_private.town_matches(uuid),
  thamba_private.scope_matches(uuid, uuid), thamba_private.stand_matches(uuid, uuid, uuid)
to thamba_reader, thamba_writer;

-- Shared catalog reads feed the server's curated Town projection.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'towns', 'licences', 'simulation_profiles', 'landmarks', 'routes', 'fare_charts', 'fare_routes'
  ] loop
    execute format('grant select on public.%I to thamba_reader, service_role', table_name);
    execute format('grant select on public.%I to thamba_writer', table_name);
    execute format('create policy catalog_reader on public.%I for select to thamba_reader using (true)',
      table_name);
    execute format('create policy scoped_catalog_reader on public.%I for select to thamba_writer
      using (thamba_private.town_matches(%I))', table_name,
      case when table_name = 'towns' then 'id' else 'town_id' end);
    execute format('create policy catalog_provisioner on public.%I for all to service_role
      using (true) with check (true)', table_name);
  end loop;

  foreach table_name in array array['stands', 'stand_pickup_cues', 'stand_neighbours'] loop
    execute format('grant select on public.%I to thamba_reader', table_name);
    execute format('grant select, insert, update, delete on public.%I to service_role', table_name);
    execute format('create policy stand_catalog_reader on public.%I for select to thamba_reader
      using (run_scope_id = %L::uuid or thamba_private.scope_matches(town_id, run_scope_id))',
      table_name, '00000000-0000-0000-0000-000000000000');
    execute format('create policy stand_catalog_writer_read on public.%I for select to thamba_writer
      using (thamba_private.town_matches(town_id) and
        (run_scope_id = %L::uuid or thamba_private.scope_matches(town_id, run_scope_id)))',
      table_name, '00000000-0000-0000-0000-000000000000');
    execute format('create policy catalog_provisioner on public.%I for all to service_role
      using (true) with check (true)', table_name);
    execute format('grant select, insert on public.%I to thamba_writer', table_name);
    execute format('create policy demo_stand_insert on public.%I for insert to thamba_writer
      with check (run_scope_id <> %L::uuid and
        thamba_private.stand_matches(town_id, run_scope_id, %I))',
      table_name, '00000000-0000-0000-0000-000000000000',
      case when table_name = 'stands' then 'id' else 'stand_id' end);
  end loop;
end;
$$;

grant insert, update on public.towns, public.licences, public.simulation_profiles, public.landmarks
  to service_role;
grant delete on public.licences, public.simulation_profiles to service_role;
grant insert on public.routes, public.fare_charts, public.fare_routes to service_role;
grant update (is_current, version, updated_at) on public.fare_charts to service_role;
grant select, insert, update on public.coordinators to service_role;
create policy coordinator_provisioner on public.coordinators for all to service_role
  using (true) with check (true);

grant update (version, updated_at) on public.stands to thamba_writer;
create policy stand_version_writer on public.stands for update to thamba_writer
  using (thamba_private.stand_matches(town_id, run_scope_id, id))
  with check (thamba_private.stand_matches(town_id, run_scope_id, id));

grant select, insert, update on public.demo_runs to thamba_writer;
create policy demo_run_writer on public.demo_runs for all to thamba_writer
  using (thamba_private.scope_matches(town_id, id))
  with check (thamba_private.scope_matches(town_id, id));

grant select on public.coordinators to thamba_writer;
create policy coordinator_writer_read on public.coordinators for select to thamba_writer
  using (thamba_private.stand_matches(town_id, run_scope_id, stand_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'drivers', 'driver_devices', 'driver_invites', 'driver_slots', 'driver_queue_entries',
    'bookings', 'booking_search_stands', 'ride_offers', 'trips', 'domain_events',
    'push_subscriptions', 'push_deliveries', 'realtime_signals', 'rider_contacts'
  ] loop
    execute format('create policy scoped_writer on public.%I for all to thamba_writer
      using (thamba_private.stand_matches(town_id, run_scope_id, stand_id))
      with check (thamba_private.stand_matches(town_id, run_scope_id, stand_id))', table_name);
  end loop;
end;
$$;

-- A session can redeem a new invite after its prior binding was revoked in another scope.
create policy own_device_for_rebinding on public.driver_devices for select to thamba_writer
  using (session_user_id::text = current_setting('thamba.actor_subject', true)
    and current_setting('thamba.town_id', true) <> ''
    and current_setting('thamba.demo_run_id', true) <> '');

create policy quote_writer on public.fare_quotes for all to thamba_writer
  using (thamba_private.scope_matches(town_id, run_scope_id))
  with check (thamba_private.scope_matches(town_id, run_scope_id));

-- A replay must detect the same actor's key even when reused in another Town or run.
create policy command_replay_reader on public.command_log for select to thamba_writer
  using (actor = current_setting('thamba.command_actor', true)
    and command_key = current_setting('thamba.command_key', true)
    and current_setting('thamba.town_id', true) <> ''
    and current_setting('thamba.demo_run_id', true) <> '');
create policy command_writer on public.command_log for all to thamba_writer
  using (thamba_private.scope_matches(town_id, run_scope_id)
    and actor = current_setting('thamba.command_actor', true)
    and command_key = current_setting('thamba.command_key', true))
  with check (thamba_private.scope_matches(town_id, run_scope_id)
    and actor = current_setting('thamba.command_actor', true)
    and command_key = current_setting('thamba.command_key', true));

grant select, insert, update on public.drivers, public.driver_devices, public.driver_invites,
  public.driver_slots, public.driver_queue_entries, public.fare_quotes, public.command_log,
  public.push_subscriptions, public.push_deliveries, public.simulation_steps to thamba_writer;
grant select, insert on public.bookings, public.booking_search_stands, public.ride_offers,
  public.trips, public.domain_events to thamba_writer;
grant insert on public.realtime_signals, public.rider_contacts to thamba_writer;
grant delete on public.driver_queue_entries to thamba_writer;
grant update (status, no_driver_found_reason, requested_at, dispatch_deadline_at, pending_offer_id,
  next_due_at, version, updated_at) on public.bookings to thamba_writer;
grant update (status, version, updated_at) on public.ride_offers to thamba_writer;
grant update (status, arrived_at, picked_up_at, ended_at, version, updated_at) on public.trips
  to thamba_writer;

create policy scoped_writer on public.simulation_steps for all to thamba_writer
  using (thamba_private.stand_matches(town_id, demo_run_id, stand_id))
  with check (thamba_private.stand_matches(town_id, demo_run_id, stand_id));

grant select (id, town_id, demo_run_id, stand_id, next_due_at) on public.bookings,
  public.simulation_steps to thamba_sweep;
grant select (id, town_id, run_scope_id, stand_id, next_due_at) on public.push_deliveries to thamba_sweep;
create policy sweep_due_bookings on public.bookings for select to thamba_sweep
  using (next_due_at <= statement_timestamp());
create policy sweep_due_simulation_steps on public.simulation_steps for select to thamba_sweep
  using (next_due_at <= statement_timestamp());
create policy sweep_due_push_deliveries on public.push_deliveries for select to thamba_sweep
  using (next_due_at <= statement_timestamp());
