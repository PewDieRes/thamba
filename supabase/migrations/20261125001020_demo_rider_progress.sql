alter table public.drivers
  add column scripted_steps jsonb check (
    scripted_steps is null or (
      is_synthetic and run_scope_id <> '00000000-0000-0000-0000-000000000000'::uuid
      and jsonb_typeof(scripted_steps) = 'array'
    )
  );

create or replace view thamba_private.repository_queue with (security_invoker = true) as
select slot.*, queue.queued_at_epoch_microseconds::text as queued_at_epoch_microseconds,
  driver.scripted_steps as simulation_steps
from public.driver_slots slot
left join public.driver_queue_entries queue on queue.driver_id = slot.driver_id
left join public.drivers driver on driver.id = slot.driver_id;

grant create on schema public to thamba_writer;
set local role thamba_writer;
create or replace function public.thamba_provision_demo_run(
  target_town uuid, rider uuid, run_id uuid, new_stand_id uuid, template_stand_id uuid
) returns boolean language plpgsql security definer set search_path = '' as $$
declare profile_id uuid; scenario jsonb;
begin
  perform set_config('thamba.town_id', target_town::text, true);
  perform set_config('thamba.demo_run_id', run_id::text, true);
  perform set_config('thamba.stand_ids', new_stand_id::text, true);

  select p.id, p.scenarios->'successful_trip' into profile_id, scenario from public.simulation_profiles p
  join public.towns t on t.id = p.town_id and t.booking_mode = 'simulated'
  where p.town_id = target_town;
  if not found then return false; end if;
  if not exists (select from public.stands s where s.id = template_stand_id and s.town_id = target_town
    and s.demo_run_id is null) then return false; end if;

  insert into public.demo_runs (id, town_id, simulation_profile_id, rider_user_id, expires_at)
    values (run_id, target_town, profile_id, rider, statement_timestamp() + interval '1 day');
  insert into public.stands (id, town_id, demo_run_id, name, name_translations, coordinator_contact,
    coordinator_contact_translations)
    select new_stand_id, target_town, run_id, name, name_translations, coordinator_contact,
      coordinator_contact_translations from public.stands where id = template_stand_id;
  insert into public.stand_pickup_cues (town_id, run_scope_id, stand_id, landmark_id, pickup_cue, pickup_cue_translations)
    select target_town, run_id, new_stand_id, landmark_id, pickup_cue, pickup_cue_translations
    from public.stand_pickup_cues where stand_id = template_stand_id;
  -- Seed the scripted roster alongside the stand within the same isolated run.
  with roster as (
    insert into public.drivers (
      town_id, run_scope_id, stand_id, name, name_translations, is_synthetic, vehicle_number, scripted_steps
    )
    select target_town, run_id, new_stand_id, fixture->'name'->>'en', fixture->'name', true,
      'DEMO ' || lpad(position::text, 2, '0'), fixture->'steps'
    from jsonb_array_elements(coalesce(scenario->'drivers', '[]')) with ordinality as drivers(fixture, position)
    returning id
  ), slots as (
    insert into public.driver_slots (town_id, run_scope_id, stand_id, driver_id, queue_version)
    select target_town, run_id, new_stand_id, id, 1 from roster
    returning driver_id
  )
  insert into public.driver_queue_entries (town_id, run_scope_id, stand_id, driver_id, queued_at_epoch_microseconds)
  select target_town, run_id, new_stand_id, driver_id,
    (extract(epoch from statement_timestamp()) * 1000000)::bigint
  from slots;
  return true;
end;
$$;
reset role;
revoke create on schema public from thamba_writer;
