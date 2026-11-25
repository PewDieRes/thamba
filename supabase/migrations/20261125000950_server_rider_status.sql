set local role thamba_reader;
revoke execute on function public.thamba_get_rider_booking(uuid),
  public.thamba_can_read_booking(uuid) from authenticated;
reset role;

grant create on schema public to thamba_reader;
create function public.thamba_get_rider_booking(booking_id uuid, subject uuid)
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
    'pickup_at', b.pickup_at, 'chart_version', b.chart_version, 'fare_in_paise', b.fare_in_paise,
    'route_id', b.route_id, 'pickup_landmark_id', r.pickup_landmark_id,
    'destination_landmark_id', r.destination_landmark_id)
  into result
  from public.bookings b join public.routes r on r.town_id = b.town_id and r.id = b.route_id
  where b.id = booking_id;
  return result;
end;
$$;
revoke all on function public.thamba_get_rider_booking(uuid, uuid) from public, anon, authenticated, service_role;
alter function public.thamba_get_rider_booking(uuid, uuid) owner to thamba_reader;
revoke create on schema public from thamba_reader;
