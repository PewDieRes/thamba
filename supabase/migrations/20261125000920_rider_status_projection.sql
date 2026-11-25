grant create on schema public to thamba_reader;
create function public.thamba_get_rider_booking(booking_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare scope record; result jsonb;
begin
  perform set_config('thamba.actor_kind', 'rider', true);
  select * into scope from thamba_private.rider_booking_scope(booking_id);
  if not found then return null; end if;
  perform set_config('thamba.town_id', scope.town_id::text, true);
  perform set_config('thamba.demo_run_id', coalesce(scope.demo_run_id::text, 'live'), true);
  select to_jsonb(b) || jsonb_build_object(
    'pickup_landmark_id', r.pickup_landmark_id, 'destination_landmark_id', r.destination_landmark_id)
  into result
  from public.bookings b join public.routes r on r.town_id = b.town_id and r.id = b.route_id
  where b.id = booking_id;
  return result;
end;
$$;
revoke all on function public.thamba_get_rider_booking(uuid) from public, anon, authenticated, service_role;
grant execute on function public.thamba_get_rider_booking(uuid) to authenticated;
alter function public.thamba_get_rider_booking(uuid) owner to thamba_reader;
revoke create on schema public from thamba_reader;
