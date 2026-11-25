alter table public.drivers
  add column name_translations jsonb not null default '{}' check (jsonb_typeof(name_translations) = 'object'),
  add column vehicle_number text,
  add column phone_e164 text check (phone_e164 ~ '^[+]91[6-9][0-9]{9}$');

-- The Rider projection can read the active match only through the verified Rider subject.
create function thamba_private.rider_matched_driver(booking_id uuid, subject uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', d.name, 'name_translations', d.name_translations,
    'vehicle_number', d.vehicle_number, 'phone', d.phone_e164)
  from public.bookings b
  join public.trips t on t.booking_id = b.id and t.ended_at is null
  join public.drivers d on d.id = t.driver_id and d.town_id = t.town_id
    and d.run_scope_id = t.run_scope_id and d.stand_id = t.stand_id
  where b.id = $1 and b.rider_user_id = $2;
$$;
revoke all on function thamba_private.rider_matched_driver(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function thamba_private.rider_matched_driver(uuid, uuid) to thamba_reader;
grant create on schema public to thamba_reader;
set local role thamba_reader;
create or replace function public.thamba_get_rider_booking(booking_id uuid, subject uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare scope record; result jsonb;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', subject, 'is_anonymous', true)::text, true);
  perform set_config('thamba.actor_kind', 'rider', true);
  select * into scope from thamba_private.rider_booking_scope(booking_id);
  if not found then return null; end if;
  perform set_config('thamba.town_id', scope.town_id::text, true);
  perform set_config('thamba.demo_run_id', coalesce(scope.demo_run_id::text, 'live'), true);
  select jsonb_build_object(
    'id', b.id, 'rider_user_id', b.rider_user_id, 'town_id', b.town_id, 'demo_run_id', b.demo_run_id,
    'stand_id', b.stand_id, 'status', b.status, 'no_driver_found_reason', b.no_driver_found_reason,
    'matched_driver', thamba_private.rider_matched_driver(booking_id, subject),
    'pickup_at', b.pickup_at, 'chart_version', b.chart_version, 'fare_in_paise', b.fare_in_paise,
    'route_id', b.route_id, 'pickup_landmark_id', r.pickup_landmark_id,
    'destination_landmark_id', r.destination_landmark_id)
  into result
  from public.bookings b join public.routes r on r.town_id = b.town_id and r.id = b.route_id
  where b.id = booking_id;
  return result;
end;
$$;
reset role;
revoke create on schema public from thamba_reader;
