-- Existing policies remain the authority for these narrowly scoped session projections.
grant create on schema public to thamba_reader, thamba_sweep;

create function public.thamba_can_read_booking(booking_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare scope record;
begin
  perform set_config('thamba.actor_kind', 'rider', true);
  select * into scope from thamba_private.rider_booking_scope(booking_id);
  if not found then return false; end if;
  perform set_config('thamba.town_id', scope.town_id::text, true);
  perform set_config('thamba.demo_run_id', coalesce(scope.demo_run_id::text, 'live'), true);
  return exists (select from public.bookings where id = booking_id);
end;
$$;

create function public.thamba_has_driver_device()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('thamba.actor_kind', 'driver', true);
  return exists (select from public.driver_devices where status = 'active');
end;
$$;

create function public.thamba_coordinator_memberships()
returns table (id uuid, town_id uuid, run_scope_id uuid, stand_id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('thamba.actor_kind', 'coordinator', true);
  return query select c.id, c.town_id, c.run_scope_id, c.stand_id
    from public.coordinators c where c.status = 'active';
end;
$$;

create function public.thamba_due_booking_ids(before_at timestamptz, batch_size integer)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(due.id order by due.next_due_at, due.id), array[]::uuid[])
  from (select id, next_due_at from public.bookings where next_due_at <= before_at
    order by next_due_at, id limit least(greatest(batch_size, 0), 25)) due;
$$;

revoke all on function public.thamba_can_read_booking(uuid), public.thamba_has_driver_device(),
  public.thamba_coordinator_memberships(), public.thamba_due_booking_ids(timestamptz, integer)
  from public, anon, authenticated, service_role;

grant execute on function public.thamba_can_read_booking(uuid), public.thamba_has_driver_device(),
  public.thamba_coordinator_memberships() to authenticated;
grant execute on function public.thamba_due_booking_ids(timestamptz, integer) to service_role;

alter function public.thamba_can_read_booking(uuid) owner to thamba_reader;
alter function public.thamba_has_driver_device() owner to thamba_reader;
alter function public.thamba_coordinator_memberships() owner to thamba_reader;
alter function public.thamba_due_booking_ids(timestamptz, integer) owner to thamba_sweep;
revoke create on schema public from thamba_reader, thamba_sweep;

create index bookings_by_rider_and_status on public.bookings (rider_user_id, status);
create trigger repository_revision_changed after insert or update or delete on public.coordinators
  for each statement execute function thamba_private.bump_repository_revision();

create table thamba_private.request_rate_limits (
  scope text not null,
  key_digest text not null,
  window_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (scope, key_digest, window_at)
);
alter table thamba_private.request_rate_limits enable row level security;
create index request_rate_limits_by_window on thamba_private.request_rate_limits (window_at);

create function public.thamba_allow_request(bucket text, key_digest text, request_limit integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_window timestamptz := date_trunc('minute', statement_timestamp());
begin
  if request_limit is null or request_limit < 1 or key_digest is null or key_digest !~ '^[a-f0-9]{64}$'
    or bucket is null or bucket not in ('booking', 'rider_session', 'driver_session', 'invite_issue', 'invite_redeem', 'coordinator_login') then
    return false;
  end if;
  insert into thamba_private.request_rate_limits as limits (scope, key_digest, window_at, request_count)
    values (bucket, key_digest, current_window, 1)
    on conflict on constraint request_rate_limits_pkey
    do update set request_count = limits.request_count + 1 where limits.request_count < request_limit;
  return found;
end;
$$;
revoke all on function public.thamba_allow_request(text, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.thamba_allow_request(text, text, integer) to service_role;

select cron.schedule('thamba-prune-request-rate-limits', '*/15 * * * *',
  $$delete from thamba_private.request_rate_limits where window_at < statement_timestamp() - interval '15 minutes'$$);
create or replace function public.thamba_repository_list(
  resource_name text, filters jsonb, expected_revision text default null
) returns jsonb language plpgsql stable set search_path = '' security definer as $$
declare relation_name text; sort_column text; permitted_filters text[]; predicates text; result jsonb;
begin
  if expected_revision is not null and expected_revision <> public.thamba_repository_revision() then
    raise exception using errcode = '40001', message = 'Repository snapshot changed';
  end if;

  select spec.relation_name, spec.sort_column, spec.permitted_filters
  into strict relation_name, sort_column, permitted_filters
  from (values
    ('bookings', 'thamba_private.repository_bookings', 'id', array['id','rider_user_id','status']),
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
  ) spec(resource, relation_name, sort_column, permitted_filters)
  where spec.resource = resource_name;

  predicates := thamba_private.repository_filter_sql(filters, permitted_filters);
  execute format('select coalesce(jsonb_agg(to_jsonb(row) order by row.%I), ''[]'')
    from %s row where %s', sort_column, relation_name, predicates)
  into result using filters;
  return result;
end;
$$;
