-- The API roles cannot call the command gateway. Server logins inherit only their provisioned role.
grant execute on function public.thamba_repository_revision(), public.thamba_repository_list(text, jsonb, text)
  to thamba_writer;
revoke execute on function public.thamba_allow_request(text, text, integer) from service_role;
grant execute on function public.thamba_allow_request(text, text, integer) to thamba_writer;

-- Rebuild the due reader with the role's existing row policy and a distinct database login.
grant create on schema public to thamba_sweep, thamba_writer;
set local role thamba_sweep;
revoke execute on function public.thamba_due_booking_ids(timestamptz, integer) from service_role;
reset role;

create function public.thamba_is_coordinator_email(target_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select from auth.users u join public.coordinators c on c.coordinator_user_id = u.id
    where lower(u.email) = lower(target_email) and u.email_confirmed_at is not null
      and u.is_anonymous is false and c.status = 'active'
  );
$$;
revoke all on function public.thamba_is_coordinator_email(text) from public, anon, authenticated, service_role;
grant execute on function public.thamba_is_coordinator_email(text) to thamba_reader;

create function thamba_private.lock_repository_revision(expected_revision text)
returns void language plpgsql security definer set search_path = '' as $$
declare current_revision text;
begin
  select revision::text into strict current_revision from thamba_private.repository_revision where singleton for update;
  if expected_revision is not null and expected_revision <> current_revision then
    raise exception using errcode = '40001', message = 'Repository snapshot changed';
  end if;
end;
$$;
revoke all on function thamba_private.lock_repository_revision(text) from public, anon, authenticated, service_role;
grant execute on function thamba_private.lock_repository_revision(text) to thamba_writer;

-- Rebinding appends a new generation while keeping revoked rows available to existing references.
create function thamba_private.save_scoped_device(row_data jsonb, expected_version integer)
returns void language plpgsql set search_path = '' as $$
declare device public.driver_devices; driver public.drivers; previous public.driver_devices;
begin
  device := jsonb_populate_record(null::public.driver_devices, row_data);
  select * into strict driver from public.drivers where id = device.driver_id;
  select * into previous from public.driver_devices where session_user_id = device.session_user_id
    order by version desc limit 1;
  if previous.version is distinct from expected_version then
    raise exception using errcode = '40001', message = 'Device version changed';
  end if;

  if device.status = 'active' then
    insert into public.driver_devices (town_id, run_scope_id, stand_id, driver_id, session_user_id,
      bound_at, status, version)
    values (driver.town_id, driver.run_scope_id, driver.stand_id, device.driver_id, device.session_user_id,
      device.bound_at, device.status, coalesce(expected_version, 0) + 1);
  else
    update public.driver_devices set status = 'revoked', revoked_at = device.revoked_at,
      version = expected_version + 1, updated_at = statement_timestamp()
    where id = previous.id and status = 'active';
    if not found then
      raise exception using errcode = '40001', message = 'Device version changed';
    end if;
  end if;
end;
$$;
revoke all on function thamba_private.save_scoped_device(jsonb, integer)
  from public, anon, authenticated, service_role;
grant execute on function thamba_private.save_scoped_device(jsonb, integer) to thamba_writer;

-- The aggregate writer updates only mutable attributes on existing records.
grant delete on public.booking_search_stands to thamba_writer;
grant update (request_due_at) on public.bookings to thamba_writer;

create function thamba_private.save_scoped_booking(row_data jsonb, expected_version integer)
returns void language plpgsql set search_path = '' as $$
declare booking public.bookings; saved_search jsonb;
begin
  if expected_version is null then
    perform thamba_private.save_repository_booking(row_data, null);
    return;
  end if;
  booking := jsonb_populate_record(null::public.bookings, row_data);
  perform thamba_private.save_repository_row('public.bookings',
    array['status','no_driver_found_reason','request_due_at','requested_at','dispatch_deadline_at','pending_offer_id','next_due_at'],
    row(jsonb_build_object('id', booking.id), row_data, expected_version)::thamba_private.repository_row_write);

  select jsonb_agg(stand_id order by position) into saved_search
    from public.booking_search_stands where booking_id = booking.id;
  if saved_search is distinct from nullif(row_data->'search_stand_ids', 'null'::jsonb) then
    delete from public.booking_search_stands where booking_id = booking.id;
    insert into public.booking_search_stands (town_id, run_scope_id, booking_id, stand_id, position)
      select booking.town_id, coalesce(booking.demo_run_id, '00000000-0000-0000-0000-000000000000'),
        booking.id, item.id::uuid, item.position - 1
      from jsonb_array_elements_text(row_data->'search_stand_ids') with ordinality item(id, position);
  end if;
end;
$$;

create function thamba_private.save_scoped_trip(row_data jsonb, expected_version integer)
returns void language plpgsql set search_path = '' as $$
declare trip public.trips;
begin
  if expected_version is null then
    perform thamba_private.save_repository_trip(row_data, null);
    return;
  end if;
  trip := jsonb_populate_record(null::public.trips, row_data);
  perform thamba_private.save_repository_row('public.trips',
    array['status','arrived_at','picked_up_at','ended_at'],
    row(jsonb_build_object('id', trip.id), row_data, expected_version)::thamba_private.repository_row_write);
  if trip.ended_at is not null then
    update public.driver_slots set active_trip_id = null where driver_id = trip.driver_id and active_trip_id = trip.id;
  end if;
end;
$$;

create function thamba_private.apply_scoped_write(intent jsonb, scope jsonb)
returns void language plpgsql set search_path = '' as $$
declare row_data jsonb := intent->'row'; resource text := intent->>'resource';
  expected_version integer := (intent->>'expectedVersion')::integer;
begin
  case resource
    when 'bookings' then perform thamba_private.save_scoped_booking(row_data, expected_version);
    when 'trips' then perform thamba_private.save_scoped_trip(row_data, expected_version);
    when 'devices' then perform thamba_private.save_scoped_device(row_data, expected_version);
    when 'offers' then
      if expected_version is null then
        perform thamba_private.save_repository_entity(resource, row_data, null);
      else
        perform thamba_private.save_repository_row('public.ride_offers', array['status'],
          row(jsonb_build_object('id', row_data->'id'), row_data, expected_version)::thamba_private.repository_row_write);
      end if;
    when 'events' then perform thamba_private.save_repository_event(row_data);
    when 'queue' then perform thamba_private.save_repository_queue(row_data, expected_version);
    when 'quotes', 'invites' then perform thamba_private.save_repository_entity(resource, row_data, expected_version);
    when 'commands' then perform thamba_private.save_repository_entity(resource, row_data || scope, expected_version);
    else raise exception using errcode = '42501', message = 'Unsupported command resource';
  end case;
end;
$$;

revoke all on function thamba_private.save_scoped_booking(jsonb, integer),
  thamba_private.save_scoped_trip(jsonb, integer), thamba_private.apply_scoped_write(jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function thamba_private.save_scoped_booking(jsonb, integer),
  thamba_private.save_scoped_trip(jsonb, integer), thamba_private.apply_scoped_write(jsonb, jsonb),
  thamba_private.save_repository_event(jsonb), thamba_private.save_repository_entity(text, jsonb, integer)
  to thamba_writer;

create function public.thamba_scoped_repository_commit(writes jsonb, expected_revision text, scope jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare intent jsonb; stand_ids text; actor_kind text := scope->>'actor_kind';
  actor_subject text := scope->>'actor_subject'; command_actor text := scope->>'command_actor';
begin
  perform thamba_private.lock_repository_revision(expected_revision);
  select string_agg(stand_id, ',') into stand_ids from jsonb_array_elements_text(scope->'stand_ids') stand_id;
  perform set_config('thamba.town_id', scope->>'town_id', true);
  perform set_config('thamba.demo_run_id', coalesce(scope->>'demo_run_id', 'live'), true);
  perform set_config('thamba.stand_ids', coalesce(stand_ids, ''), true);
  perform set_config('thamba.actor_subject', coalesce(actor_subject, ''), true);
  perform set_config('thamba.actor_kind', case
    when actor_kind = 'anonymous' and command_actor like 'session:%' then 'driver'
    when actor_kind = 'anonymous' then 'rider'
    else actor_kind
  end, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', actor_subject, 'is_anonymous', actor_kind = 'anonymous')::text, true);
  perform set_config('thamba.command_actor', coalesce(command_actor, ''), true);
  perform set_config('thamba.command_key', coalesce(scope->>'command_key', ''), true);

  if actor_kind = 'coordinator' and not exists (
    select from public.coordinators c where c.coordinator_user_id::text = actor_subject
      and c.status = 'active' and command_actor = 'coordinator:' || c.id::text
  ) then
    raise exception using errcode = '42501', message = 'Coordinator membership unavailable';
  end if;

  for intent in select value from jsonb_array_elements(writes) loop
    perform thamba_private.apply_scoped_write(intent, scope);
  end loop;
end;
$$;
revoke all on function public.thamba_scoped_repository_commit(jsonb, text, jsonb)
  from public, anon, authenticated, service_role;
alter function public.thamba_scoped_repository_commit(jsonb, text, jsonb) owner to thamba_writer;
revoke create on schema public from thamba_sweep, thamba_writer;
