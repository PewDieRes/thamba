create function public.thamba_coordinator_dashboard(
  subject uuid, target_coordinator uuid, target_stand uuid, target_town uuid, target_run uuid,
  day_start timestamptz, day_end timestamptz
) returns jsonb language sql stable security definer set search_path = '' as $$
  with scope as (
    select s.id, s.town_id, s.run_scope_id, s.name, s.name_translations
    from public.coordinators c
    join auth.users account on account.id = c.coordinator_user_id and not account.is_anonymous
    join public.stands s on (s.town_id, s.run_scope_id, s.id) = (c.town_id, c.run_scope_id, c.stand_id)
    left join public.demo_runs run on (run.town_id, run.id) = (s.town_id, s.demo_run_id)
    where c.id = target_coordinator and c.coordinator_user_id = subject and c.status = 'active'
      and s.id = target_stand and s.town_id = target_town
      and s.demo_run_id is not distinct from target_run
      and (s.demo_run_id is null or run.expires_at > statement_timestamp())
  ), driver_rows as (
    select d.id, d.name, d.name_translations, d.vehicle_number,
      queue.queued_at_epoch_microseconds, device.id is not null as has_device,
      case when slot.active_trip_id is not null then 'on_trip'
        when queue.reserved_offer_id is not null then 'reserved'
        when queue.driver_id is not null then 'online' else 'offline' end as availability,
      d.is_synthetic and target_run is not null and device.id is null
        and slot.driver_id is not null and slot.active_trip_id is null
        and slot.pending_offer_id is null as can_invite,
      (select count(*) from public.trips t where t.driver_id = d.id
        and t.status = 'completed' and t.ended_at >= day_start and t.ended_at < day_end) as trips_today
    from scope s
    join public.drivers d on (d.town_id, d.run_scope_id, d.stand_id) = (s.town_id, s.run_scope_id, s.id)
    left join public.driver_slots slot on slot.driver_id = d.id
    left join public.driver_queue_entries queue on queue.driver_id = d.id
    left join public.driver_devices device on device.driver_id = d.id and device.status = 'active'
  ), booking_rows as (
    select b.id, b.status, b.fare_in_paise, coalesce(b.pickup_at, b.requested_at) as pickup_at
    from scope s
    join public.bookings b on (b.town_id, b.run_scope_id) = (s.town_id, s.run_scope_id)
    left join public.trips t on t.booking_id = b.id
    left join public.ride_offers o on o.id = b.pending_offer_id
    where s.id in (b.stand_id, t.stand_id, o.stand_id)
  ), queue_changes as (
    select e.id, e.driver_id, e.commit_order, e.occurred_at, e.payload
    from scope s
    join public.domain_events e
      on (e.town_id, e.run_scope_id, e.stand_id) = (s.town_id, s.run_scope_id, s.id)
    where e.event_type = 'DriverQueueChanged'
  )
  select jsonb_build_object(
    'stand', jsonb_build_object('id', s.id, 'name', s.name, 'names', s.name_translations),
    'drivers', coalesce((select jsonb_agg(jsonb_build_object(
      'driverId', id, 'name', name, 'names', name_translations, 'vehicleNumber', vehicle_number,
      'queuedAt', queued_at_epoch_microseconds::text, 'availability', availability,
      'tripsToday', trips_today, 'hasDevice', has_device, 'canInvite', can_invite
    ) order by name, id) from driver_rows), '[]'::jsonb),
    'bookings', coalesce((select jsonb_agg(jsonb_build_object(
      'bookingId', id, 'status', status, 'fareInPaise', fare_in_paise,
      'pickupAt', extract(epoch from pickup_at) * 1000
    ) order by pickup_at desc nulls last, id) from booking_rows), '[]'::jsonb),
    'changes', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', id, 'driverId', driver_id, 'occurredAt', extract(epoch from occurred_at) * 1000,
      'reason', case when payload->>'reason' = 'withdrawn' and payload#>>'{actor,type}' = 'rider'
        then 'cancelled' else payload->>'reason' end,
      'availabilityReason', payload->>'availabilityReason'
    )) || jsonb_build_object('before', payload#>>'{before,queuedAt,value}') order by commit_order)
    from queue_changes), '[]'::jsonb)
  ) from scope s;
$$;

revoke all on function public.thamba_coordinator_dashboard(uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.thamba_coordinator_dashboard(uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz)
  to thamba_reader;

create table public.demo_complaints (
  town_id uuid not null,
  demo_run_id uuid not null,
  id uuid not null,
  topic text not null check (topic in ('fare', 'wait', 'trip')),
  created_at timestamptz not null default statement_timestamp(),
  primary key (demo_run_id, id),
  foreign key (town_id, demo_run_id) references public.demo_runs (town_id, id) on delete cascade
);
alter table public.demo_complaints enable row level security;
revoke all on public.demo_complaints from public, anon, authenticated, service_role;

create function public.thamba_submit_demo_complaint(
  subject uuid, target_town uuid, target_run uuid, complaint_id uuid, complaint_topic text
) returns text language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.demo_runs r
    join auth.users account on account.id = r.rider_user_id and account.is_anonymous
    where r.town_id = target_town and r.id = target_run and r.rider_user_id = subject
      and r.expires_at > statement_timestamp()
  ) then return 'forbidden'; end if;
  insert into public.demo_complaints (town_id, demo_run_id, id, topic)
    values (target_town, target_run, complaint_id, complaint_topic) on conflict do nothing;
  if exists (select 1 from public.demo_complaints
    where demo_run_id = target_run and id = complaint_id and topic = complaint_topic)
    then return 'saved'; end if;
  return 'idempotency_key_reused';
end;
$$;
revoke all on function public.thamba_submit_demo_complaint(uuid, uuid, uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.thamba_submit_demo_complaint(uuid, uuid, uuid, uuid, text)
  to thamba_writer;
