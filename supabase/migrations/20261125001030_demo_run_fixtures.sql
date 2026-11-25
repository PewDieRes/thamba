drop function public.thamba_provision_demo_run(uuid, uuid, uuid, uuid, uuid);

create or replace view thamba_private.repository_queue with (security_invoker = true) as
select slot.*, queue.queued_at_epoch_microseconds::text as queued_at_epoch_microseconds,
  driver.scripted_steps as simulation_steps,
  case when driver.scripted_steps is not null then driver.name end as demo_driver_name,
  case when driver.scripted_steps is not null then driver.name_translations end as demo_driver_names,
  case when driver.scripted_steps is not null then driver.vehicle_number end as demo_vehicle_number
from public.driver_slots slot
left join public.driver_queue_entries queue on queue.driver_id = slot.driver_id
left join public.drivers driver on driver.id = slot.driver_id;

grant create on schema public to thamba_writer;
create function public.thamba_provision_demo_run(
  target_town uuid, rider uuid, run_id uuid, new_stand_id uuid,
  run_expires_at timestamptz, stand_fixture jsonb, driver_fixtures jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare profile_id uuid;
begin
  perform set_config('thamba.town_id', target_town::text, true);
  perform set_config('thamba.demo_run_id', run_id::text, true);
  perform set_config('thamba.stand_ids', new_stand_id::text, true);

  select p.id into profile_id from public.simulation_profiles p
  join public.towns t on t.id = p.town_id and t.booking_mode = 'simulated'
  where p.town_id = target_town;
  if not found then return false; end if;

  insert into public.demo_runs (id, town_id, simulation_profile_id, rider_user_id, expires_at)
    values (run_id, target_town, profile_id, rider, run_expires_at);

  insert into public.stands (id, town_id, demo_run_id, name, name_translations, coordinator_contact,
    coordinator_contact_translations)
    select new_stand_id, target_town, run_id, fixture.name, fixture.name_translations,
      fixture.coordinator_contact, fixture.coordinator_contact_translations
    from jsonb_to_record(stand_fixture) fixture(
      name text, name_translations jsonb, coordinator_contact text,
      coordinator_contact_translations jsonb
    );

  insert into public.stand_pickup_cues (town_id, run_scope_id, stand_id, landmark_id, pickup_cue, pickup_cue_translations)
    select target_town, run_id, new_stand_id, cue.landmark_id, cue.pickup_cue, cue.pickup_cue_translations
    from jsonb_to_recordset(stand_fixture->'pickup_cues') cue(
      landmark_id uuid, pickup_cue text, pickup_cue_translations jsonb
    );

  insert into public.drivers (id, town_id, run_scope_id, stand_id, name, name_translations, is_synthetic,
    vehicle_number, scripted_steps)
    select fixture.id, target_town, run_id, new_stand_id, fixture.name, fixture.name_translations, true,
      fixture.vehicle_number, fixture.scripted_steps
    from jsonb_to_recordset(driver_fixtures) fixture(
      id uuid, name text, name_translations jsonb, vehicle_number text, scripted_steps jsonb
    );

  insert into public.driver_slots (town_id, run_scope_id, stand_id, driver_id)
    select target_town, run_id, new_stand_id, fixture.id
    from jsonb_to_recordset(driver_fixtures) fixture(id uuid);

  insert into public.driver_queue_entries (town_id, run_scope_id, stand_id, driver_id, queued_at_epoch_microseconds)
    select target_town, run_id, new_stand_id, fixture.id, fixture.queued_at_epoch_microseconds
    from jsonb_to_recordset(driver_fixtures) fixture(id uuid, queued_at_epoch_microseconds bigint);

  return true;
end;
$$;

revoke all on function public.thamba_provision_demo_run(uuid, uuid, uuid, uuid, timestamptz, jsonb, jsonb)
  from public, anon, authenticated, service_role;
alter function public.thamba_provision_demo_run(uuid, uuid, uuid, uuid, timestamptz, jsonb, jsonb)
  owner to thamba_writer;
revoke create on schema public from thamba_writer;
