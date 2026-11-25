create table thamba_private.repository_revision (
  singleton boolean primary key default true check (singleton),
  revision bigint not null default 0
);
alter table thamba_private.repository_revision enable row level security;
insert into thamba_private.repository_revision default values;

create function thamba_private.bump_repository_revision()
returns trigger language plpgsql set search_path = '' security definer as $$
begin
  update thamba_private.repository_revision set revision = revision + 1 where singleton;
  return null;
end;
$$;

do $$
declare tracked_table text;
begin
  foreach tracked_table in array array[
    'towns', 'licences', 'simulation_profiles', 'demo_runs', 'stands', 'stand_pickup_cues',
    'stand_neighbours', 'routes', 'fare_charts', 'fare_routes', 'fare_quotes', 'drivers',
    'driver_slots', 'driver_queue_entries', 'driver_devices', 'driver_invites',
    'bookings', 'booking_search_stands', 'ride_offers', 'trips', 'command_log', 'domain_events'
  ] loop
    execute format('create trigger repository_revision after insert or update or delete or truncate
      on public.%I for each statement execute function thamba_private.bump_repository_revision()', tracked_table);
  end loop;
end;
$$;

alter table public.domain_events add column commit_order bigint generated always as identity unique;

create view thamba_private.repository_towns as
select town.*,
  (select to_jsonb(licence) from public.licences licence where licence.town_id = town.id) as licence,
  exists (select from public.simulation_profiles profile where profile.town_id = town.id) as has_simulation_profile,
  coalesce((select jsonb_agg(run order by run.created_at, run.id) from public.demo_runs run
    where run.town_id = town.id and run.expires_at > statement_timestamp()), '[]') as demo_runs
from public.towns town;

create view thamba_private.repository_stands as
select stand.*,
  coalesce((select jsonb_agg(cue order by cue.landmark_id) from public.stand_pickup_cues cue
    where cue.stand_id = stand.id), '[]') as pickup_cues,
  coalesce((select jsonb_agg(neighbour.neighbour_stand_id order by neighbour.position)
    from public.stand_neighbours neighbour where neighbour.stand_id = stand.id), '[]') as neighbour_stand_ids
from public.stands stand;

alter table public.fare_routes add column position integer not null default 0 check (position >= 0);
create view thamba_private.repository_charts as
select chart.*, coalesce((
  select jsonb_agg(to_jsonb(fare) || jsonb_build_object(
    'pickup_landmark_id', route.pickup_landmark_id, 'destination_landmark_id', route.destination_landmark_id
  ) order by fare.position, fare.route_id)
  from public.fare_routes fare
  join public.routes route on route.town_id = fare.town_id and route.id = fare.route_id
  where fare.town_id = chart.town_id and fare.chart_version = chart.chart_version
), '[]') as route_fares
from public.fare_charts chart where chart.is_current;

create view thamba_private.repository_quotes as
select quote.*, route.pickup_landmark_id, route.destination_landmark_id
from public.fare_quotes quote
join public.routes route on route.town_id = quote.town_id and route.id = quote.route_id;

create view thamba_private.repository_trips as
select trip.*, booking.chart_version, booking.fare_in_paise, booking.rider_user_id,
  booking.route_id, route.pickup_landmark_id, route.destination_landmark_id
from public.trips trip
join public.bookings booking on booking.id = trip.booking_id
join public.routes route on route.id = booking.route_id and route.town_id = booking.town_id;

create view thamba_private.repository_bookings as
select booking.*, route.pickup_landmark_id, route.destination_landmark_id,
  (select jsonb_agg(search.stand_id order by search.position)
    from public.booking_search_stands search where search.booking_id = booking.id) as search_stand_ids,
  (select to_jsonb(offer) from public.ride_offers offer where offer.id = booking.pending_offer_id) as pending_offer,
  (select to_jsonb(trip) from thamba_private.repository_trips trip
    where trip.booking_id = booking.id and trip.active_id is not null) as active_trip
from public.bookings booking
join public.routes route on route.id = booking.route_id and route.town_id = booking.town_id;

create view thamba_private.repository_queue as
select slot.*, queue.queued_at_epoch_microseconds::text as queued_at_epoch_microseconds
from public.driver_slots slot
left join public.driver_queue_entries queue on queue.driver_id = slot.driver_id;

create view thamba_private.repository_devices as
select distinct on (session_user_id)
  id, town_id, run_scope_id, stand_id, driver_id, session_user_id, bound_at, revoked_at, status, version
from public.driver_devices order by session_user_id, version desc;

create function public.thamba_repository_revision()
returns text language sql stable set search_path = '' security definer as $$
  select revision::text from thamba_private.repository_revision;
$$;

create function thamba_private.repository_filter_sql(filters jsonb, permitted_filters text[])
returns text language plpgsql immutable set search_path = '' as $$
declare predicates text;
begin
  if exists (select from jsonb_object_keys(filters) key where not key = any(permitted_filters)) then
    raise exception using errcode = '22023', message = 'Unsupported repository filter';
  end if;

  select string_agg(case when jsonb_typeof(value) = 'array'
    then format('row.%1$I = any(array(select item::%2$s from jsonb_array_elements_text($1->%1$L) item))',
      key, case when key = 'status' then 'text' else 'uuid' end)
    when value = 'null'::jsonb then format('row.%I is null', key)
    else format('row.%1$I = ($1->>%1$L)::%2$s', key,
      case when key in ('status','slug','token_hash','actor','command_key') then 'text' else 'uuid' end)
  end, ' and ') into predicates from jsonb_each(filters);
  return coalesce(predicates, 'true');
end;
$$;

create function public.thamba_repository_list(
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
  ) spec(resource, relation_name, sort_column, permitted_filters)
  where spec.resource = resource_name;

  predicates := thamba_private.repository_filter_sql(filters, permitted_filters);
  execute format('select coalesce(jsonb_agg(to_jsonb(row) order by row.%I), ''[]'')
    from %s row where %s', sort_column, relation_name, predicates)
  into result using filters;
  return result;
end;
$$;

revoke all on function public.thamba_repository_revision(),
  public.thamba_repository_list(text, jsonb, text) from public, anon, authenticated, service_role;
grant execute on function public.thamba_repository_revision(),
  public.thamba_repository_list(text, jsonb, text) to service_role;
