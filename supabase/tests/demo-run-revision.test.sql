begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
grant usage on schema extensions to thamba_writer;
select plan(9);

insert into auth.users (id, is_anonymous) values
  ('d0000000-0000-4000-8000-000000000001', true),
  ('d0000000-0000-4000-8000-000000000002', true);

insert into demo_runs (id, town_id, simulation_profile_id, rider_user_id, expires_at)
select fixture.id, p.town_id, p.id, fixture.rider, now() + interval '1 hour'
from simulation_profiles p cross join (values
  ('d0000000-0000-4000-8000-000000000011'::uuid, 'd0000000-0000-4000-8000-000000000001'::uuid),
  ('d0000000-0000-4000-8000-000000000012'::uuid, 'd0000000-0000-4000-8000-000000000002'::uuid),
  ('d0000000-0000-4000-8000-000000000013'::uuid, 'd0000000-0000-4000-8000-000000000001'::uuid)
) fixture(id, rider)
where p.town_id = '00000000-0000-0000-0000-000000000001';

create temp table test_snapshot as
select context, null::text as revision,
  public.thamba_repository_revision() as legacy_revision
from (select jsonb_build_object(
  'target', jsonb_build_object('kind', 'town', 'townId', '00000000-0000-0000-0000-000000000001',
    'demoRunId', 'd0000000-0000-4000-8000-000000000011'),
  'actor_kind', 'anonymous', 'actor_subject', 'd0000000-0000-4000-8000-000000000001',
  'command_actor', 'rider:d0000000-0000-4000-8000-000000000001', 'command_key', 'revision-test'
) as context) request;
grant select, update on test_snapshot to thamba_writer;

set local role thamba_writer;
update test_snapshot set revision = public.thamba_scoped_repository_revision(context);
reset role;

update demo_runs set expires_at = expires_at + interval '1 hour'
where id = 'd0000000-0000-4000-8000-000000000012';

insert into stands (id, town_id, demo_run_id, name, coordinator_contact)
values ('d0000000-0000-4000-8000-000000000022', '00000000-0000-0000-0000-000000000001',
  'd0000000-0000-4000-8000-000000000012', 'Second run Stand', 'Demo');

set local role thamba_writer;
select throws_ok($$select public.thamba_scoped_repository_list('towns',
  '{"id":"00000000-0000-0000-0000-000000000001"}', legacy_revision, context) from test_snapshot$$,
  '40001', 'Repository snapshot changed', 'the database-wide revision rejects the interleaved read');

select is((select jsonb_array_length(public.thamba_scoped_repository_list('towns',
  '{"id":"00000000-0000-0000-0000-000000000001"}', revision, context)) from test_snapshot), 1,
  'another Rider run can change between snapshot reads');
select lives_ok($$select public.thamba_scoped_repository_commit(jsonb_build_array(jsonb_build_object(
  'resource', 'commands', 'row', jsonb_build_object(
    'actor', context->>'command_actor', 'command_key', context->>'command_key',
    'input_hash', repeat('0', 64), 'result', '{}'::jsonb)
)), revision, jsonb_build_object(
  'town_id', context#>>'{target,townId}', 'demo_run_id', context#>>'{target,demoRunId}',
  'stand_ids', '[]'::jsonb, 'actor_kind', context->>'actor_kind', 'actor_subject', context->>'actor_subject',
  'command_actor', context->>'command_actor', 'command_key', context->>'command_key'
)) from test_snapshot$$, 'another Rider run can change before commit');
update test_snapshot set revision = public.thamba_scoped_repository_revision(context);
reset role;

select is((select count(*) from command_log where command_key = 'revision-test'), 1::bigint,
  'the first run can commit a command after the second run changes');

update demo_runs set expires_at = expires_at + interval '1 hour'
where id = 'd0000000-0000-4000-8000-000000000011';

set local role thamba_writer;
select throws_ok($$select public.thamba_scoped_repository_list('towns',
  '{"id":"00000000-0000-0000-0000-000000000001"}', revision, context) from test_snapshot$$,
  '40001', 'Repository snapshot changed', 'a change in the observed run invalidates its snapshot');

update test_snapshot set context = jsonb_set(context, '{command_key}', '"cross-run-replay"');
update test_snapshot set revision = public.thamba_scoped_repository_revision(context);
reset role;

insert into command_log (town_id, demo_run_id, actor, command_key, input_hash, result)
select '00000000-0000-0000-0000-000000000001', 'd0000000-0000-4000-8000-000000000013',
  context->>'command_actor', context->>'command_key', repeat('0', 64), '{}' from test_snapshot;

set local role thamba_writer;
select isnt((select public.thamba_scoped_repository_revision(context) from test_snapshot),
  (select revision from test_snapshot), 'the same actor command key can change in another run');
reset role;

insert into stands (id, town_id, demo_run_id, name, coordinator_contact)
values ('d0000000-0000-4000-8000-000000000021', '00000000-0000-0000-0000-000000000001',
  'd0000000-0000-4000-8000-000000000013', 'Third run Stand', 'Demo');

set local role thamba_writer;
update test_snapshot set revision = public.thamba_scoped_repository_revision(context);
reset role;

insert into bookings (id, town_id, demo_run_id, rider_user_id, stand_id, chart_version, route_id,
  fare_in_paise, status, requested_at, dispatch_deadline_at, next_due_at)
values ('d0000000-0000-4000-8000-000000000031', '00000000-0000-0000-0000-000000000001',
  'd0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000021', 1, '00000000-0000-0000-0000-000000000031',
  6000, 'requested', now(), now() + interval '10 minutes', now());

set local role thamba_writer;
select isnt((select public.thamba_scoped_repository_revision(context) from test_snapshot),
  (select revision from test_snapshot), 'the same Rider booking in another run invalidates the snapshot');

update test_snapshot set revision = public.thamba_scoped_repository_revision(context);
reset role;

update towns set version = version + 1 where id = '00000000-0000-0000-0000-000000000001';

set local role thamba_writer;
select isnt((select public.thamba_scoped_repository_revision(context) from test_snapshot),
  (select revision from test_snapshot), 'Town catalogue changes invalidate Demo snapshots');
reset role;
select ok(not has_function_privilege('authenticated', 'public.thamba_scoped_repository_revision(jsonb)', 'execute'),
  'browser sessions cannot use the scoped revision gateway');

select * from finish();
rollback;
