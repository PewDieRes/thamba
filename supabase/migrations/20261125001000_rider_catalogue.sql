create or replace view thamba_private.repository_towns with (security_invoker = true) as
select town.*,
  (select to_jsonb(licence) from public.licences licence where licence.town_id = town.id) as licence,
  exists (select from public.simulation_profiles profile where profile.town_id = town.id) as has_simulation_profile,
  coalesce((select jsonb_agg(run order by run.created_at, run.id) from public.demo_runs run
    where run.town_id = town.id and run.expires_at > statement_timestamp()), '[]') as demo_runs,
  coalesce((select jsonb_agg(l order by l.slug) from public.landmarks l where l.town_id = town.id),
    '[]') as catalogue_landmarks,
  coalesce((select jsonb_agg(to_jsonb(s) || jsonb_build_object('pickup_landmark_ids', coalesce((
    select jsonb_agg(c.landmark_id order by c.landmark_id)
    from public.stand_pickup_cues c where c.stand_id = s.id
  ), '[]')) order by s.name, s.id)
  from public.stands s where s.town_id = town.id and s.demo_run_id is null), '[]') as catalogue_stands
from public.towns town;

