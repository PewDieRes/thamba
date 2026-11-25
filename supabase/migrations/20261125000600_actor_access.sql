-- Hosted Supabase keeps the Auth schema outside custom Postgres roles.
create function thamba_private.actor_user_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select auth.uid();
$$;

create function thamba_private.is_anonymous_actor(actor_kind text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select current_setting('thamba.actor_kind', true) = actor_kind
    and thamba_private.actor_user_id() is not null and auth.jwt() -> 'is_anonymous' = 'true'::jsonb;
$$;

create function thamba_private.is_coordinator()
returns boolean language sql stable security definer set search_path = ''
as $$
  select current_setting('thamba.actor_kind', true) = 'coordinator'
    and thamba_private.actor_user_id() is not null and auth.jwt() -> 'is_anonymous' = 'false'::jsonb;
$$;

create function thamba_private.is_bound_driver(target_driver_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select thamba_private.is_anonymous_actor('driver') and exists (
    select from public.driver_devices
    where session_user_id = thamba_private.actor_user_id() and driver_id = target_driver_id and status = 'active'
  );
$$;

create function thamba_private.coordinates_stand(target_stand_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select thamba_private.is_coordinator() and exists (
    select from public.coordinators
    where coordinator_user_id = thamba_private.actor_user_id() and stand_id = target_stand_id and status = 'active'
  );
$$;

create function thamba_private.can_read_rider_contact(target_booking_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select
    from public.bookings as booking
    left join public.trips as trip on trip.booking_id = booking.id
    where booking.id = target_booking_id and (
      thamba_private.stand_matches(booking.town_id, booking.run_scope_id, booking.stand_id)
        and thamba_private.coordinates_stand(booking.stand_id)
      or thamba_private.stand_matches(trip.town_id, trip.run_scope_id, trip.stand_id) and (
        thamba_private.coordinates_stand(trip.stand_id)
        or (trip.active_id is not null and thamba_private.is_bound_driver(trip.driver_id))
      )
    )
  );
$$;

revoke all on function thamba_private.actor_user_id(),
  thamba_private.is_anonymous_actor(text), thamba_private.is_coordinator(),
  thamba_private.is_bound_driver(uuid), thamba_private.coordinates_stand(uuid),
  thamba_private.can_read_rider_contact(uuid)
from public, anon, authenticated, service_role;
grant execute on function thamba_private.actor_user_id(),
  thamba_private.is_anonymous_actor(text), thamba_private.is_coordinator(),
  thamba_private.is_bound_driver(uuid), thamba_private.coordinates_stand(uuid),
  thamba_private.can_read_rider_contact(uuid)
to thamba_reader;

grant select on public.bookings, public.fare_quotes, public.demo_runs, public.driver_devices,
  public.coordinators, public.drivers, public.driver_queue_entries, public.ride_offers,
  public.domain_events, public.command_log, public.rider_contacts to thamba_reader;

create policy rider_booking on public.bookings for select to thamba_reader
  using (thamba_private.is_anonymous_actor('rider') and rider_user_id = (select thamba_private.actor_user_id())
    and thamba_private.scope_matches(town_id, run_scope_id));
create policy coordinator_booking on public.bookings for select to thamba_reader
  using (thamba_private.stand_matches(town_id, run_scope_id, stand_id)
    and thamba_private.coordinates_stand(stand_id));
create policy rider_quote on public.fare_quotes for select to thamba_reader
  using (thamba_private.is_anonymous_actor('rider') and rider_user_id = (select thamba_private.actor_user_id())
    and thamba_private.scope_matches(town_id, run_scope_id));
create policy rider_demo_run on public.demo_runs for select to thamba_reader
  using (thamba_private.is_anonymous_actor('rider') and rider_user_id = (select thamba_private.actor_user_id())
    and thamba_private.scope_matches(town_id, id));

-- The server resolves membership before opening the scoped command transaction.
create policy driver_own_binding on public.driver_devices for select to thamba_reader
  using (thamba_private.is_anonymous_actor('driver') and session_user_id = (select thamba_private.actor_user_id()));
create policy coordinator_own_membership on public.coordinators for select to thamba_reader
  using (thamba_private.is_coordinator() and coordinator_user_id = (select thamba_private.actor_user_id()));

create policy actor_command_result on public.command_log for select to thamba_reader
  using (thamba_private.scope_matches(town_id, run_scope_id) and (
    thamba_private.is_anonymous_actor('rider') and actor = 'rider:' || (select thamba_private.actor_user_id())::text
    or thamba_private.is_anonymous_actor('driver') and actor = 'session:' || (select thamba_private.actor_user_id())::text
    or thamba_private.is_coordinator() and exists (
      select from public.coordinators as membership
      where actor = 'coordinator:' || membership.id::text and membership.status = 'active'
        and membership.town_id = command_log.town_id
        and membership.run_scope_id = command_log.run_scope_id
        and thamba_private.stand_matches(membership.town_id, membership.run_scope_id, membership.stand_id)
    )
  ));

create policy rider_contact_reader on public.rider_contacts for select to thamba_reader
  using (purge_after > statement_timestamp() and thamba_private.can_read_rider_contact(booking_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'driver_devices', 'drivers', 'driver_queue_entries', 'ride_offers', 'domain_events'
  ] loop
    execute format('create policy coordinator_stand_reader on public.%I for select to thamba_reader
      using (thamba_private.stand_matches(town_id, run_scope_id, stand_id)
        and thamba_private.coordinates_stand(stand_id))', table_name);
  end loop;
end;
$$;

-- Only the named projection may join the offer back to the pickup.
create view public.pending_driver_offers with (security_barrier = true) as
select offer.id as offer_id, route.pickup_landmark_id, cue.pickup_cue, offer.expires_at
from public.ride_offers as offer
join public.bookings as booking on booking.id = offer.booking_id
join public.routes as route on route.id = booking.route_id
join public.stand_pickup_cues as cue
  on cue.stand_id = offer.stand_id and cue.landmark_id = route.pickup_landmark_id
where offer.status = 'pending' and offer.expires_at > statement_timestamp()
  and thamba_private.stand_matches(offer.town_id, offer.run_scope_id, offer.stand_id)
  and thamba_private.is_bound_driver(offer.driver_id);

create view public.assigned_trips with (security_barrier = true) as
select trip.id as trip_id, trip.booking_id, trip.stand_id, trip.status, trip.accepted_at,
  trip.arrived_at, trip.picked_up_at, trip.ended_at, booking.route_id, route.pickup_landmark_id,
  route.destination_landmark_id, booking.chart_version, booking.fare_in_paise
from public.trips as trip
join public.bookings as booking on booking.id = trip.booking_id
join public.routes as route on route.id = booking.route_id
where thamba_private.scope_matches(trip.town_id, trip.run_scope_id) and (
  thamba_private.is_anonymous_actor('rider') and booking.rider_user_id = thamba_private.actor_user_id()
  or thamba_private.stand_matches(trip.town_id, trip.run_scope_id, trip.stand_id)
    and (thamba_private.is_bound_driver(trip.driver_id) or thamba_private.coordinates_stand(trip.stand_id))
  or thamba_private.stand_matches(booking.town_id, booking.run_scope_id, booking.stand_id)
    and thamba_private.coordinates_stand(booking.stand_id)
);

revoke all on public.pending_driver_offers, public.assigned_trips
  from public, anon, authenticated, service_role;
grant select on public.pending_driver_offers, public.assigned_trips to thamba_reader;

grant select (id, recipient_user_id, created_at) on public.realtime_signals to authenticated;
create policy recipient_signal on public.realtime_signals for select to authenticated
  using (recipient_user_id = (select auth.uid()));
