create table thamba_private.repository_dependency_revisions (
  dependency text primary key,
  revision bigint not null default 1
);
alter table thamba_private.repository_dependency_revisions enable row level security;

create function thamba_private.repository_scope_key(town_id text, run_id text)
returns text language sql immutable set search_path = '' as $$
  select jsonb_build_array('scope', town_id,
    coalesce(run_id, '00000000-0000-0000-0000-000000000000'))::text;
$$;

create function thamba_private.repository_command_key(actor text, command_key text)
returns text language sql immutable strict set search_path = '' as $$
  select jsonb_build_array('command', actor, command_key)::text;
$$;

create function thamba_private.bump_repository_dependencies(dependencies text[])
returns void language sql set search_path = '' as $$
  insert into thamba_private.repository_dependency_revisions as tracked (dependency)
    select distinct dependency from unnest(dependencies) as keys(dependency)
    where dependency is not null
    on conflict (dependency) do update set revision = tracked.revision + 1;
$$;

create function thamba_private.repository_row_dependencies(relation_name text, row_data jsonb)
returns text[] language sql immutable set search_path = '' as $$
  select array[
    thamba_private.repository_scope_key(row_data->>'town_id',
      case when relation_name = 'demo_runs' then row_data->>'id' else row_data->>'run_scope_id' end),
    case when relation_name in ('stands', 'stand_pickup_cues', 'stand_neighbours')
      and row_data->>'run_scope_id' = '00000000-0000-0000-0000-000000000000' then 'catalogue' end,
    case when relation_name = 'bookings' then 'rider:' || (row_data->>'rider_user_id') end,
    case when relation_name = 'driver_devices' then 'device:' || (row_data->>'session_user_id') end,
    case when relation_name = 'command_log'
      then thamba_private.repository_command_key(row_data->>'actor', row_data->>'command_key') end
  ];
$$;

create function thamba_private.bump_scoped_repository_rows()
returns trigger language plpgsql security definer set search_path = '' as $$
declare dependencies text[] := '{}';
begin
  if tg_op <> 'INSERT' then
    dependencies := thamba_private.repository_row_dependencies(tg_table_name, to_jsonb(old));
  end if;
  if tg_op <> 'DELETE' then
    dependencies := dependencies || thamba_private.repository_row_dependencies(tg_table_name, to_jsonb(new));
  end if;
  perform thamba_private.bump_repository_dependencies(dependencies);
  return null;
end;
$$;

create function thamba_private.bump_repository_catalogue()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform thamba_private.bump_repository_dependencies(array['catalogue']);
  return null;
end;
$$;

do $$
declare tracked_table text;
begin
  foreach tracked_table in array array[
    'demo_runs', 'stands', 'stand_pickup_cues', 'stand_neighbours', 'fare_quotes', 'drivers',
    'driver_slots', 'driver_queue_entries', 'driver_devices', 'driver_invites', 'bookings',
    'booking_search_stands', 'ride_offers', 'trips', 'command_log', 'domain_events', 'coordinators'
  ] loop
    -- Use the same lock order for direct writes and the command gateway.
    execute format('drop trigger %I on public.%I',
      case when tracked_table = 'coordinators' then 'repository_revision_changed' else 'repository_revision' end,
      tracked_table);
    execute format('create trigger repository_revision before insert or update or delete or truncate
      on public.%I for each statement execute function thamba_private.bump_repository_revision()', tracked_table);
    execute format('create trigger repository_scope_revision after insert or update or delete
      on public.%I for each row execute function thamba_private.bump_scoped_repository_rows()', tracked_table);
    execute format('create trigger repository_catalogue_revision after truncate on public.%I
      for each statement execute function thamba_private.bump_repository_catalogue()', tracked_table);
  end loop;

  foreach tracked_table in array array[
    'towns', 'licences', 'simulation_profiles', 'landmarks', 'routes', 'fare_charts', 'fare_routes'
  ] loop
    -- The legacy revision trigger sorts first among the statement triggers.
    if tracked_table = 'landmarks' then
      execute 'create trigger repository_revision before insert or update or delete or truncate
        on public.landmarks for each statement execute function thamba_private.bump_repository_revision()';
    end if;
    execute format('create trigger repository_shared_revision after insert or update or delete or truncate
      on public.%I for each statement execute function thamba_private.bump_repository_catalogue()', tracked_table);
  end loop;
end;
$$;

-- Subject and command dependencies protect cross-run booking caps, device binding, and command replay.
create function thamba_private.scoped_repository_revision(town_id text, run_id text, context jsonb)
returns text language sql stable security definer set search_path = '' as $$
  with dependencies as (
    select thamba_private.repository_scope_key(town_id, run_id) as scope_key,
      case when context->>'actor_kind' = 'anonymous' then context->>'actor_subject' end as subject,
      thamba_private.repository_command_key(context->>'command_actor', context->>'command_key') as command_key
  )
  select jsonb_build_array(scope_key, coalesce(catalogue.revision, 0), coalesce(scope.revision, 0),
    coalesce(rider.revision, 0), coalesce(device.revision, 0), coalesce(command.revision, 0))::text
  from dependencies
  left join thamba_private.repository_dependency_revisions catalogue on catalogue.dependency = 'catalogue'
  left join thamba_private.repository_dependency_revisions scope on scope.dependency = dependencies.scope_key
  left join thamba_private.repository_dependency_revisions rider on rider.dependency = 'rider:' || subject
  left join thamba_private.repository_dependency_revisions device on device.dependency = 'device:' || subject
  left join thamba_private.repository_dependency_revisions command on command.dependency = dependencies.command_key;
$$;

revoke all on function thamba_private.repository_scope_key(text, text),
  thamba_private.repository_command_key(text, text), thamba_private.bump_repository_dependencies(text[]),
  thamba_private.repository_row_dependencies(text, jsonb), thamba_private.bump_scoped_repository_rows(),
  thamba_private.bump_repository_catalogue(), thamba_private.scoped_repository_revision(text, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function thamba_private.scoped_repository_revision(text, text, jsonb) to thamba_writer;
