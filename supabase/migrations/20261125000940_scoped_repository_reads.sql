-- Scope lookup authorizes the precise target before the writer reads any aggregate state.
create function thamba_private.resolve_repository_scope(context jsonb)
returns table (town_id uuid, demo_run_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare target jsonb := context->'target'; actor text := context->>'actor_kind';
  subject uuid := nullif(context->>'actor_subject', '')::uuid;
begin
  case target->>'kind'
    when 'catalog' then
      return query select t.id, null::uuid from public.towns t where t.slug = target->>'slug';
    when 'town' then
      if actor <> 'anonymous' then return; end if;
      return query select t.id, (target->>'demoRunId')::uuid from public.towns t
        where t.id = (target->>'townId')::uuid and (target->>'demoRunId' is null or exists (
          select from public.demo_runs r where r.id = (target->>'demoRunId')::uuid
            and r.town_id = t.id and r.rider_user_id = subject and r.expires_at > statement_timestamp()
        ));
    when 'quote' then
      if actor <> 'anonymous' then return; end if;
      return query select q.town_id, q.demo_run_id from public.fare_quotes q
        where q.id = (target->>'quoteId')::uuid and q.rider_user_id = subject;
    when 'rider_booking' then
      if actor <> 'anonymous' then return; end if;
      return query select b.town_id, b.demo_run_id from public.bookings b
        where b.id = (target->>'bookingId')::uuid and b.rider_user_id = subject;
    when 'driver_booking' then
      if actor <> 'anonymous' then return; end if;
      return query select b.town_id, b.demo_run_id from public.bookings b
        join public.trips t on t.booking_id = b.id
        join public.driver_devices d on d.driver_id = t.driver_id
          and d.town_id = t.town_id and d.run_scope_id = t.run_scope_id and d.stand_id = t.stand_id
        where b.id = (target->>'bookingId')::uuid and d.session_user_id = subject and d.status = 'active';
    when 'sweep_booking' then
      if actor <> 'sweep' then return; end if;
      return query select b.town_id, b.demo_run_id from public.bookings b
        where b.id = (target->>'bookingId')::uuid;
    when 'offer' then
      if actor <> 'anonymous' then return; end if;
      return query select b.town_id, b.demo_run_id from public.bookings b
        join public.ride_offers o on o.booking_id = b.id
        join public.driver_devices d on d.driver_id = o.driver_id
          and d.town_id = o.town_id and d.run_scope_id = o.run_scope_id and d.stand_id = o.stand_id
        where o.id = (target->>'offerId')::uuid and d.session_user_id = subject and d.status = 'active';
    when 'stand' then
      if actor <> 'coordinator' then return; end if;
      return query select s.town_id, s.demo_run_id from public.stands s
        join public.coordinators c on c.stand_id = s.id
        where s.id = (target->>'standId')::uuid and c.coordinator_user_id = subject and c.status = 'active';
    when 'device' then
      if actor <> 'anonymous' then return; end if;
      return query select s.town_id, s.demo_run_id from public.stands s
        join public.driver_devices d on d.stand_id = s.id
        where d.session_user_id = subject and d.status = 'active';
    when 'invite' then
      if actor <> 'anonymous' or subject is null then return; end if;
      return query select s.town_id, s.demo_run_id from public.stands s
        join public.driver_invites i on i.stand_id = s.id
        where i.token_hash = target->>'tokenHash';
    else return;
  end case;
end;
$$;

revoke all on function thamba_private.resolve_repository_scope(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function thamba_private.resolve_repository_scope(jsonb) to thamba_writer;

-- The session cap intentionally counts the verified Rider's active bookings across Towns and runs.
create function thamba_private.rider_active_booking_ids(subject uuid, statuses jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', b.id)), '[]'::jsonb)
  from public.bookings b where b.rider_user_id = subject
    and b.status in (select jsonb_array_elements_text(statuses));
$$;
revoke all on function thamba_private.rider_active_booking_ids(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function thamba_private.rider_active_booking_ids(uuid, jsonb) to thamba_writer;

alter view thamba_private.repository_bookings set (security_invoker = true);
alter view thamba_private.repository_queue set (security_invoker = true);
alter view thamba_private.repository_stands set (security_invoker = true);
alter view thamba_private.repository_towns set (security_invoker = true);
alter view thamba_private.repository_charts set (security_invoker = true);
alter view thamba_private.repository_quotes set (security_invoker = true);
alter view thamba_private.repository_trips set (security_invoker = true);
alter view thamba_private.repository_devices set (security_invoker = true);

grant select on thamba_private.repository_bookings, thamba_private.repository_queue,
  thamba_private.repository_stands, thamba_private.repository_towns, thamba_private.repository_charts,
  thamba_private.repository_quotes, thamba_private.repository_trips, thamba_private.repository_devices
  to thamba_writer;
revoke execute on function public.thamba_repository_list(text, jsonb, text) from thamba_writer;

grant create on schema public to thamba_writer;
create function public.thamba_scoped_repository_list(
  resource_name text, filters jsonb, expected_revision text, context jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare scope record; stand_ids text; relation_name text; sort_column text;
  permitted_filters text[]; predicates text; result jsonb;
begin
  if expected_revision is distinct from public.thamba_repository_revision() then
    raise exception using errcode = '40001', message = 'Repository snapshot changed';
  end if;

  select * into scope from thamba_private.resolve_repository_scope(context);
  if not found then return '[]'::jsonb; end if;
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
revoke all on function public.thamba_scoped_repository_list(text, jsonb, text, jsonb)
  from public, anon, authenticated, service_role;
alter function public.thamba_scoped_repository_list(text, jsonb, text, jsonb) owner to thamba_writer;
revoke create on schema public from thamba_writer;
