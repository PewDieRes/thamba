grant create on schema public to thamba_writer;
set local role thamba_writer;

create function public.thamba_scoped_repository_revision(context jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select thamba_private.scoped_repository_revision(scope.town_id::text, scope.demo_run_id::text, context)
  from (values (true)) request(present)
  left join lateral thamba_private.resolve_repository_scope(context) scope on request.present;
$$;
revoke all on function public.thamba_scoped_repository_revision(jsonb) from public, anon, authenticated, service_role;

create or replace function public.thamba_scoped_repository_list(
  resource_name text, filters jsonb, expected_revision text, context jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare scope record; stand_ids text; relation_name text; sort_column text;
  permitted_filters text[]; predicates text; result jsonb;
begin
  select * into scope from thamba_private.resolve_repository_scope(context);
  if expected_revision is distinct from (case
    when left(expected_revision, 1) = '[' then
      thamba_private.scoped_repository_revision(scope.town_id::text, scope.demo_run_id::text, context)
    else public.thamba_repository_revision()
  end) then
    raise exception using errcode = '40001', message = 'Repository snapshot changed';
  end if;

  if scope.town_id is null then return '[]'::jsonb; end if;
  perform set_config('thamba.town_id', scope.town_id::text, true);
  perform set_config('thamba.demo_run_id', coalesce(scope.demo_run_id::text, 'live'), true);
  perform set_config('thamba.actor_subject', coalesce(context->>'actor_subject', ''), true);
  perform set_config('thamba.actor_kind', case
    when context->>'actor_kind' = 'anonymous' and context->>'command_actor' like 'rider:%' then 'rider'
    when context->>'actor_kind' = 'anonymous' and context->'target'->>'kind' = 'rider_booking' then 'rider'
    when context->>'actor_kind' = 'anonymous' then 'driver'
    else context->>'actor_kind'
  end, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', context->>'actor_subject', 'is_anonymous', context->>'actor_kind' = 'anonymous'
  )::text, true);
  perform set_config('thamba.command_actor', coalesce(context->>'command_actor', ''), true);
  perform set_config('thamba.command_key', coalesce(context->>'command_key', ''), true);
  select string_agg(s.id::text, ',') into stand_ids from public.stands s
    where s.town_id = scope.town_id and s.demo_run_id is not distinct from scope.demo_run_id;
  perform set_config('thamba.stand_ids', coalesce(stand_ids, ''), true);

  if resource_name = 'bookings' and filters ? 'rider_user_id' then
    if context->>'actor_kind' = 'anonymous' and filters->>'rider_user_id' = context->>'actor_subject' then
      return thamba_private.rider_active_booking_ids((context->>'actor_subject')::uuid, filters->'status');
    end if;
    return '[]'::jsonb;
  end if;
  if filters = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'A repository filter is required';
  end if;

  select spec.relation_name, spec.sort_column, spec.permitted_filters
    into strict relation_name, sort_column, permitted_filters from (values
      ('bookings', 'thamba_private.repository_bookings', 'id', array['id']),
      ('offers', 'public.ride_offers', 'created_at', array['id','booking_id','driver_id','status']),
      ('queue', 'thamba_private.repository_queue', 'driver_id', array['driver_id','town_id','run_scope_id','stand_id']),
      ('stands', 'thamba_private.repository_stands', 'id', array['id']),
      ('towns', 'thamba_private.repository_towns', 'id', array['id','slug']),
      ('charts', 'thamba_private.repository_charts', 'town_id', array['town_id']),
      ('quotes', 'thamba_private.repository_quotes', 'id', array['id']),
      ('trips', 'thamba_private.repository_trips', 'id', array['booking_id','driver_id','status']),
      ('invites', 'public.driver_invites', 'created_at', array['token_hash','driver_id','status']),
      ('devices', 'thamba_private.repository_devices', 'id', array['session_user_id','driver_id','status']),
      ('commands', 'public.command_log', 'id', array['actor','command_key']),
      ('events', 'public.domain_events', 'commit_order', array['id'])
  ) spec(resource, relation_name, sort_column, permitted_filters) where spec.resource = resource_name;

  predicates := thamba_private.repository_filter_sql(filters, permitted_filters);
  execute format('select coalesce(jsonb_agg(to_jsonb(row) order by row.%I), ''[]'') from %s row where %s',
    sort_column, relation_name, predicates) into result using filters;
  return result;
end;
$$;

create or replace function public.thamba_scoped_repository_commit(writes jsonb, expected_revision text, scope jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare intent jsonb; stand_ids text; actor_kind text := scope->>'actor_kind';
  actor_subject text := scope->>'actor_subject'; command_actor text := scope->>'command_actor';
begin
  if left(expected_revision, 1) = '[' then
    -- Direct writes take this lock before bumping dependencies, so validation and commit are atomic.
    perform thamba_private.lock_repository_revision(null);
    if expected_revision is distinct from thamba_private.scoped_repository_revision(
      scope->>'town_id', scope->>'demo_run_id', scope
    ) then
      raise exception using errcode = '40001', message = 'Repository snapshot changed';
    end if;
  else
    perform thamba_private.lock_repository_revision(expected_revision);
  end if;
  select string_agg(stand_id, ',') into stand_ids from jsonb_array_elements_text(scope->'stand_ids') stand_id;
  perform set_config('thamba.town_id', scope->>'town_id', true);
  perform set_config('thamba.demo_run_id', coalesce(scope->>'demo_run_id', 'live'), true);
  perform set_config('thamba.stand_ids', coalesce(stand_ids, ''), true);
  perform set_config('thamba.actor_subject', coalesce(actor_subject, ''), true);
  perform set_config('thamba.actor_kind', case
    when actor_kind = 'anonymous' and command_actor like 'session:%' then 'driver'
    when actor_kind = 'anonymous' then 'rider'
    else actor_kind
  end, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', actor_subject, 'is_anonymous', actor_kind = 'anonymous')::text, true);
  perform set_config('thamba.command_actor', coalesce(command_actor, ''), true);
  perform set_config('thamba.command_key', coalesce(scope->>'command_key', ''), true);

  if actor_kind = 'coordinator' and not exists (
    select from public.coordinators c where c.coordinator_user_id::text = actor_subject
      and c.status = 'active' and command_actor = 'coordinator:' || c.id::text
  ) then
    raise exception using errcode = '42501', message = 'Coordinator membership unavailable';
  end if;

  for intent in select value from jsonb_array_elements(writes) loop
    perform thamba_private.apply_scoped_write(intent, scope);
  end loop;
end;
$$;

reset role;
revoke create on schema public from thamba_writer;
