begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
grant usage on schema extensions to thamba_writer;

select plan(15);

select is((
  select count(*)
  from unnest(array[
    'towns', 'licences', 'simulation_profiles', 'demo_runs', 'landmarks', 'stands',
    'stand_neighbours', 'stand_pickup_cues', 'routes', 'fare_charts', 'fare_routes', 'fare_quotes',
    'drivers', 'driver_slots', 'driver_devices', 'driver_invites', 'driver_queue_entries', 'bookings',
    'booking_search_stands', 'ride_offers', 'trips', 'rider_contacts', 'coordinators', 'command_log',
    'domain_events', 'push_subscriptions', 'push_deliveries', 'realtime_signals', 'simulation_steps'
  ]) as expected(name)
  where not exists (
    select from pg_class as relation
    where relation.relnamespace = 'public'::regnamespace and relation.relname = expected.name
      and relation.relrowsecurity
  )
), 0::bigint, 'Every Thamba table has RLS enabled');

select is((select count(*) from towns where slug in ('malvan', 'demo-town') and booking_mode = 'simulated'),
  2::bigint, 'Both contest Towns use the simulated configuration');
select is((select count(*) from simulation_profiles where kind = 'synthetic' and town_id =
  (select id from towns where slug = 'demo-town')), 1::bigint, 'Demo Town has one synthetic profile');
select is((select count(*) from stands where town_id = (select id from towns where slug = 'demo-town')),
  1::bigint, 'Demo Town has one Stand template');
select is((select count(*) from fare_charts where is_current and is_illustrative and town_id =
  (select id from towns where slug = 'demo-town')), 1::bigint, 'Demo Town has an illustrative Fare chart');
select is((select count(*) from licences where town_id = (select id from towns where slug = 'malvan')),
  0::bigint, 'Malvan has no licence');
select is((select count(*) from simulation_profiles where town_id = (select id from towns where slug = 'malvan')),
  0::bigint, 'Malvan has no simulation profile');
select is((select count(*) from landmarks where is_illustrative and town_id =
  (select id from towns where slug = 'malvan')), 2::bigint, 'Malvan landmarks are marked illustrative');

select is((select schedule from cron.job where jobname = 'thamba-dispatch-sweep' and active),
  '* * * * *', 'The dispatch sweep is scheduled every minute');
select is(thamba_private.enqueue_dispatch_sweep(), null::bigint,
  'The sweep queues no request without Vault configuration');

insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-000000000601', true);
insert into demo_runs (id, town_id, simulation_profile_id, rider_user_id, expires_at)
select run.id, profile.town_id, profile.id, '00000000-0000-0000-0000-000000000601', now() + interval '1 hour'
from simulation_profiles as profile cross join (values ('00000000-0000-0000-0000-000000000611'::uuid),
  ('00000000-0000-0000-0000-000000000612'::uuid)) as run(id);
insert into stands (id, town_id, demo_run_id, name, coordinator_contact) values
  ('00000000-0000-0000-0000-000000000621', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000611', 'Run A Stand', 'Demo'),
  ('00000000-0000-0000-0000-000000000622', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000612', 'Run B Stand', 'Demo');

select throws_ok($$ insert into stand_neighbours
    (town_id, run_scope_id, stand_id, neighbour_stand_id, position)
  values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000611',
    '00000000-0000-0000-0000-000000000621', '00000000-0000-0000-0000-000000000622', 1) $$,
  '23503', null, 'A Stand neighbour cannot point to another run');

insert into command_log (town_id, demo_run_id, actor, command_key, input_hash, result) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000611',
    'rider:00000000-0000-0000-0000-000000000601', 'same-key', repeat('a', 64), '{"ok":true}');
select throws_ok($$ insert into command_log
    (town_id, demo_run_id, actor, command_key, input_hash, result)
  select town_id, '00000000-0000-0000-0000-000000000612', actor, command_key,
    repeat('b', 64), result from command_log where command_key = 'same-key' $$,
  '23505', null, 'The same actor cannot reuse a command key in another run');

set local role thamba_writer;
set local thamba.town_id = '00000000-0000-0000-0000-000000000001';
set local thamba.demo_run_id = '00000000-0000-0000-0000-000000000612';
set local thamba.stand_ids = '00000000-0000-0000-0000-000000000622';
select is((select count(*) from stands where demo_run_id is not null), 1::bigint,
  'A writer can only see the Stand in its own demo run');
select is((select count(*) from command_log), 0::bigint, 'A writer cannot scan command results');
set local thamba.command_actor = 'rider:00000000-0000-0000-0000-000000000601';
set local thamba.command_key = 'same-key';
select is((select count(*) from command_log), 1::bigint,
  'Verified actor and key can resolve a replay across scopes');

reset role;
select * from finish();
rollback;
