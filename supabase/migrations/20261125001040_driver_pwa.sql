alter table public.driver_slots
  add column needs_rejoin boolean not null default false;

alter table public.rider_contacts
  add column first_name text check (char_length(trim(first_name)) between 1 and 80);

create or replace view thamba_private.repository_queue with (security_invoker = true) as
select slot.id, slot.town_id, slot.run_scope_id, slot.stand_id, slot.driver_id,
  slot.pending_offer_id, slot.active_trip_id, slot.queue_driver_id, slot.queue_version,
  slot.version, slot.created_at, slot.updated_at, queue.queued_at_epoch_microseconds::text as queued_at_epoch_microseconds,
  driver.scripted_steps as simulation_steps,
  case when driver.scripted_steps is not null then driver.name end as demo_driver_name,
  case when driver.scripted_steps is not null then driver.name_translations end as demo_driver_names,
  case when driver.scripted_steps is not null then driver.vehicle_number end as demo_vehicle_number,
  slot.needs_rejoin
from public.driver_slots slot
left join public.driver_queue_entries queue on queue.driver_id = slot.driver_id
left join public.drivers driver on driver.id = slot.driver_id;

create or replace function thamba_private.save_repository_queue(row_data jsonb, expected_version integer)
returns void language plpgsql set search_path = '' as $$
declare slot public.driver_slots; queue_time bigint;
begin
  slot := jsonb_populate_record(null::public.driver_slots, row_data);
  queue_time := (row_data->>'queued_at_epoch_microseconds')::bigint;
  if expected_version is null then
    insert into public.driver_slots (town_id, run_scope_id, stand_id, driver_id, pending_offer_id, needs_rejoin)
      values (slot.town_id, slot.run_scope_id, slot.stand_id, slot.driver_id, slot.pending_offer_id, coalesce(slot.needs_rejoin, false));
  else
    perform thamba_private.save_repository_row('public.driver_slots',
      array['pending_offer_id','queue_version','needs_rejoin'],
      row(jsonb_build_object('driver_id', slot.driver_id, 'town_id', slot.town_id,
        'run_scope_id', slot.run_scope_id, 'stand_id', slot.stand_id), row_data || jsonb_build_object('queue_version', expected_version + 1, 'needs_rejoin', coalesce(slot.needs_rejoin, false)), expected_version)::thamba_private.repository_row_write);
  end if;

  if queue_time is null then
    delete from public.driver_queue_entries where driver_id = slot.driver_id;
  else
    insert into public.driver_queue_entries (town_id, run_scope_id, stand_id, driver_id,
      queued_at_epoch_microseconds, reserved_offer_id, version)
      values (slot.town_id, slot.run_scope_id, slot.stand_id, slot.driver_id, queue_time,
        slot.pending_offer_id, coalesce(expected_version, 0) + 1)
    on conflict (driver_id) do update set queued_at_epoch_microseconds = excluded.queued_at_epoch_microseconds,
      reserved_offer_id = excluded.reserved_offer_id, version = excluded.version;
  end if;
end;
$$;

-- The server supplies the verified anonymous subject. The join checks the current
-- binding and active assignment again at the point where contact data is read.
create function public.thamba_get_matched_rider_contact(target_booking_id uuid, subject uuid)
returns table (first_name text, phone_e164 text)
language sql stable security definer set search_path = '' as $$
  select contact.first_name, contact.phone_e164
  from public.rider_contacts contact
  join public.trips trip on trip.booking_id = contact.booking_id
    and trip.town_id = contact.town_id and trip.run_scope_id = contact.run_scope_id
  join public.driver_devices device on device.driver_id = trip.driver_id
    and device.town_id = trip.town_id and device.run_scope_id = trip.run_scope_id
    and device.stand_id = trip.stand_id
  where contact.booking_id = target_booking_id and contact.purge_after > statement_timestamp()
    and trip.active_id is not null and device.status = 'active' and device.session_user_id = subject;
$$;

revoke all on function public.thamba_get_matched_rider_contact(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.thamba_get_matched_rider_contact(uuid, uuid) to thamba_reader;
