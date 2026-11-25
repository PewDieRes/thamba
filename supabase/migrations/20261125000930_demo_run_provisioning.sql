grant create on schema public to thamba_writer;
create function public.thamba_provision_demo_run(
  target_town uuid, rider uuid, run_id uuid, new_stand_id uuid, template_stand_id uuid
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
  return true;
end;
$$;
revoke all on function public.thamba_provision_demo_run(uuid, uuid, uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
alter function public.thamba_provision_demo_run(uuid, uuid, uuid, uuid, uuid) owner to thamba_writer;
revoke create on schema public from thamba_writer;
