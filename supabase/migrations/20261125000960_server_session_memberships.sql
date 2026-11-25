set local role thamba_reader;
revoke execute on function public.thamba_has_driver_device(),
  public.thamba_coordinator_memberships() from authenticated;
reset role;

grant create on schema public to thamba_reader;
create function public.thamba_has_driver_device(subject uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', subject, 'is_anonymous', true)::text, true);
  perform set_config('thamba.actor_kind', 'driver', true);
  return exists (select from public.driver_devices where status = 'active');
end;
$$;

create function public.thamba_coordinator_memberships(subject uuid)
returns table (id uuid, town_id uuid, run_scope_id uuid, stand_id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', subject, 'is_anonymous', false)::text, true);
  perform set_config('thamba.actor_kind', 'coordinator', true);
  return query select c.id, c.town_id, c.run_scope_id, c.stand_id
    from public.coordinators c where c.status = 'active';
end;
$$;

revoke all on function public.thamba_has_driver_device(uuid), public.thamba_coordinator_memberships(uuid)
  from public, anon, authenticated, service_role;
alter function public.thamba_has_driver_device(uuid) owner to thamba_reader;
alter function public.thamba_coordinator_memberships(uuid) owner to thamba_reader;
revoke create on schema public from thamba_reader;
